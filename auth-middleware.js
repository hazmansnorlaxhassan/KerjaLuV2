const jwt = require('jsonwebtoken');
const db = require('./db');

// Middleware to verify JWT token and attach user to request object
async function authenticateToken(req, res, next) {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ message: 'Access denied. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    
    // Check if the user is suspended in real-time
    const [users] = await db.query('SELECT id, username, email, role, status, latitude, longitude FROM users WHERE id = ?', [decoded.id]);
    
    if (users.length === 0) {
      res.clearCookie('token');
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    const user = users[0];
    if (user.status === 'suspended') {
      res.clearCookie('token');
      return res.status(403).json({ message: 'Your account has been suspended by an administrator.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.clearCookie('token');
    return res.status(403).json({ message: 'Invalid or expired session. Please log in again.' });
  }
}

// Middleware to restrict routes by role(s)
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};
