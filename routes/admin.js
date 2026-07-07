const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../auth-middleware');

// Apply admin role checks to all routes in this file
router.use(authenticateToken, requireRole('admin'));

// 1. Get Admin Dashboard Statistics
router.get('/stats', async (req, res) => {
  try {
    const [[{ total_users }]] = await db.query('SELECT COUNT(*) AS total_users FROM users WHERE role != \'admin\'');
    const [[{ total_jobs }]] = await db.query('SELECT COUNT(*) AS total_jobs FROM jobs');
    const [[{ total_gigs }]] = await db.query('SELECT COUNT(*) AS total_gigs FROM gigs');
    const [[{ total_orders }]] = await db.query('SELECT COUNT(*) AS total_orders FROM orders');
    const [[{ volume }]] = await db.query('SELECT COALESCE(SUM(price), 0) AS volume FROM orders WHERE status = \'completed\'');

    res.json({
      totalUsers: total_users,
      totalJobs: total_jobs,
      totalGigs: total_gigs,
      totalOrders: total_orders,
      salesVolume: volume
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve system statistics.' });
  }
});

// 2. Get All Users List
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, username, email, role, status, created_at FROM users WHERE role != \'admin\' ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve users.' });
  }
});

// 3. Toggle User Suspension
router.post('/users/:id/toggle-status', async (req, res) => {
  const userId = req.params.id;

  if (parseInt(userId) === req.user.id) {
    return res.status(400).json({ message: 'You cannot suspend your own admin account.' });
  }

  try {
    const [users] = await db.query('SELECT status, role FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = users[0];
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Administrators cannot be suspended through this dashboard.' });
    }

    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    await db.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, userId]);

    res.json({ message: `User status changed to ${newStatus}.`, newStatus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update user status.' });
  }
});

// 4. Delete Job (Moderation)
router.delete('/jobs/:id', async (req, res) => {
  const jobId = req.params.id;
  try {
    const [result] = await db.query('DELETE FROM jobs WHERE id = ?', [jobId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Job not found.' });
    }
    res.json({ message: 'Job posting deleted by administrator.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete job.' });
  }
});

// 5. Delete Gig (Moderation)
router.delete('/gigs/:id', async (req, res) => {
  const gigId = req.params.id;
  try {
    const [result] = await db.query('DELETE FROM gigs WHERE id = ?', [gigId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Freelance gig not found.' });
    }
    res.json({ message: 'Gig service deleted by administrator.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete gig.' });
  }
});

module.exports = router;
