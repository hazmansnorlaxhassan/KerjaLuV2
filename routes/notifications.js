const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../auth-middleware');

router.use(authenticateToken);

// 1. Get user notifications
router.get('/', async (req, res) => {
  const userId = req.user.id;

  try {
    const [notifications] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [userId]
    );

    const [[{ unread_count }]] = await db.query(
      'SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    res.json({
      notifications,
      unreadCount: unread_count
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to retrieve notifications.' });
  }
});

// 2. Mark notification as read
router.put('/:id/read', async (req, res) => {
  const userId = req.user.id;
  const notifId = req.params.id;

  try {
    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [notifId, userId]
    );

    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to update notification.' });
  }
});

// 3. Mark all notifications as read
router.put('/read-all', async (req, res) => {
  const userId = req.user.id;

  try {
    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [userId]
    );

    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Failed to update notifications.' });
  }
});

module.exports = router;
