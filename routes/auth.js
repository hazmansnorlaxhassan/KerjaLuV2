const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken } = require('../auth-middleware');

// Register User
router.post('/register', async (req, res) => {
  const { username, email, password, role, phone, latitude, longitude } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  if (role !== 'jobseeker' && role !== 'employer') {
    return res.status(400).json({ message: 'Invalid role selection.' });
  }

  try {
    // Check if user already exists
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const userPhone = phone || '+673 8123456';
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, role, phone, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, email, hashedPassword, role, userPhone, latitude || null, longitude || null]
    );

    const userId = result.insertId;

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, username, email, role },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '24h' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.status(201).json({
      message: 'Registration successful!',
      user: { id: userId, username, email, role, latitude, longitude }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Registration failed. Server error.' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // Find user
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const user = users[0];

    // Check status
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended by an administrator.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '24h' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'Login successful!',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Login failed. Server error.' });
  }
});

// Quick Login for Jobseeker and Employer Demo Accounts
router.post('/quick-login', async (req, res) => {
  const { role } = req.body;

  if (!role || (role !== 'jobseeker' && role !== 'employer')) {
    return res.status(400).json({ message: 'Invalid role for quick login. Must be jobseeker or employer.' });
  }

  try {
    let user = null;

    if (role === 'jobseeker') {
      // Prioritize primary seeded jobseeker (Jane or Bob), or any active jobseeker
      const [users] = await db.query(
        `SELECT * FROM users 
         WHERE role = 'jobseeker' AND status = 'active'
         ORDER BY (CASE WHEN username = 'jane_jobseeker' THEN 1 WHEN username = 'bob_jobseeker' THEN 2 ELSE 3 END), id ASC 
         LIMIT 1`
      );
      if (users.length > 0) user = users[0];
    } else if (role === 'employer') {
      // Prioritize primary seeded employer (John), or any active employer
      const [users] = await db.query(
        `SELECT * FROM users 
         WHERE role = 'employer' AND status = 'active'
         ORDER BY (CASE WHEN username = 'john_employer' THEN 1 ELSE 2 END), id ASC 
         LIMIT 1`
      );
      if (users.length > 0) user = users[0];
    }

    if (!user) {
      return res.status(404).json({ message: `No active ${role} demo account found.` });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '24h' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      message: `Quick login successful as ${user.username}!`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Quick login error:', error);
    res.status(500).json({ message: 'Quick login failed. Server error.' });
  }
});

// Logout User
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful!' });
});

// Get User Profile
router.get('/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Get User Portfolio of Completed Jobs and Gigs
router.get('/profile/portfolio', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  try {
    if (role === 'jobseeker') {
      // 1. Secured/Completed Jobs (Applications that are accepted)
      const [completedJobs] = await db.query(
        `SELECT ja.id, ja.bid_amount, ja.created_at AS application_date, 
                j.title AS job_title, j.budget AS job_budget, 
                u.username AS employer_name
         FROM job_applications ja
         JOIN jobs j ON ja.job_id = j.id
         JOIN users u ON j.employer_id = u.id
         WHERE ja.jobseeker_id = ? AND ja.status = 'accepted'
         ORDER BY ja.created_at DESC`,
        [userId]
      );

      // 2. Completed Freelance Sales (Orders sold that are completed)
      const [completedGigs] = await db.query(
        `SELECT o.id, o.price, o.created_at AS order_date, 
                g.title AS gig_title, 
                u.username AS buyer_name
         FROM orders o
         JOIN gigs g ON o.gig_id = g.id
         JOIN users u ON o.buyer_id = u.id
         WHERE o.seller_id = ? AND o.status = 'completed'
         ORDER BY o.created_at DESC`,
        [userId]
      );

      return res.json({
        role,
        completedJobs,
        completedGigs
      });
    } else if (role === 'employer') {
      // 1. Completed/Filled Jobs (Jobs posted by employer that are closed)
      const [completedJobs] = await db.query(
        `SELECT j.id, j.title AS job_title, j.budget AS job_budget, j.created_at AS job_date,
                ja.bid_amount, ja.created_at AS hire_date,
                u.username AS jobseeker_name
         FROM jobs j
         LEFT JOIN job_applications ja ON j.id = ja.job_id AND ja.status = 'accepted'
         LEFT JOIN users u ON ja.jobseeker_id = u.id
         WHERE j.employer_id = ? AND j.status = 'closed'
         ORDER BY j.created_at DESC`,
        [userId]
      );

      // 2. Completed Freelance Purchases (Orders purchased that are completed)
      const [completedGigs] = await db.query(
        `SELECT o.id, o.price, o.created_at AS order_date,
                g.title AS gig_title,
                u.username AS seller_name
         FROM orders o
         JOIN gigs g ON o.gig_id = g.id
         JOIN users u ON o.seller_id = u.id
         WHERE o.buyer_id = ? AND o.status = 'completed'
         ORDER BY o.created_at DESC`,
        [userId]
      );

      return res.json({
        role,
        completedJobs,
        completedGigs
      });
    } else {
      // Admin or other role
      return res.json({
        role,
        completedJobs: [],
        completedGigs: []
      });
    }
  } catch (error) {
    console.error('Error fetching user portfolio:', error);
    res.status(500).json({ message: 'Failed to retrieve portfolio.' });
  }
});

// Update User Location
router.put('/profile/location', authenticateToken, async (req, res) => {
  const { latitude, longitude } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ message: 'Latitude and longitude are required.' });
  }

  try {
    await db.query(
      'UPDATE users SET latitude = ?, longitude = ? WHERE id = ?',
      [latitude, longitude, req.user.id]
    );

    res.json({
      message: 'Location updated successfully!',
      location: { latitude, longitude }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update location.' });
  }
});

// Update User Profile (Username, Email, Phone & Password)
router.put('/profile', authenticateToken, async (req, res) => {
  const { username, email, phone, currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!username || !email) {
    return res.status(400).json({ message: 'Username and email are required.' });
  }

  try {
    // 1. Check if username is already taken by another user
    const [existingUsername] = await db.query(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, userId]
    );
    if (existingUsername.length > 0) {
      return res.status(400).json({ message: 'Username is already taken.' });
    }

    // 2. Check if email is already taken by another user
    const [existingEmail] = await db.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );
    if (existingEmail.length > 0) {
      return res.status(400).json({ message: 'Email is already in use.' });
    }

    // 3. If trying to change password
    let passwordHash = null;
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to change password.' });
      }

      // Fetch current password from DB
      const [users] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
      const user = users[0];

      // Compare passwords
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect current password.' });
      }

      // Hash new password
      passwordHash = await bcrypt.hash(newPassword, 10);
    }

    // 4. Update database
    const userPhone = phone || '+673 8123456';
    if (passwordHash) {
      await db.query(
        'UPDATE users SET username = ?, email = ?, phone = ?, password = ? WHERE id = ?',
        [username, email, userPhone, passwordHash, userId]
      );
    } else {
      await db.query(
        'UPDATE users SET username = ?, email = ?, phone = ? WHERE id = ?',
        [username, email, userPhone, userId]
      );
    }

    res.json({ message: 'Profile updated successfully!', phone: userPhone });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update profile.' });
  }
});

module.exports = router;
