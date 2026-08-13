const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../auth-middleware');

// Apply auth to all message routes
router.use(authenticateToken);

// 1. Get user's conversation threads
router.get('/conversations', async (req, res) => {
  const userId = req.user.id;

  try {
    const [conversations] = await db.query(
      `SELECT 
        u.id AS other_user_id,
        u.username AS other_username,
        u.email AS other_email,
        u.role AS other_role,
        m.content AS last_message,
        m.created_at AS last_message_time,
        m.sender_id AS last_sender_id,
        (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0) AS unread_count
       FROM (
         SELECT 
           IF(sender_id = ?, receiver_id, sender_id) AS partner_id,
           MAX(id) AS max_id
         FROM messages
         WHERE sender_id = ? OR receiver_id = ?
         GROUP BY partner_id
       ) latest
       JOIN messages m ON latest.max_id = m.id
       JOIN users u ON latest.partner_id = u.id
       ORDER BY m.created_at DESC`,
      [userId, userId, userId, userId]
    );

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Failed to retrieve conversation history.' });
  }
});

// 2. Get message thread with a specific user
router.get('/thread/:otherUserId', async (req, res) => {
  const userId = req.user.id;
  const otherUserId = req.params.otherUserId;

  try {
    // Fetch partner details
    const [partners] = await db.query('SELECT id, username, role FROM users WHERE id = ?', [otherUserId]);
    if (partners.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const partner = partners[0];

    // Fetch messages between users
    const [messages] = await db.query(
      `SELECT m.*, u.username AS sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = ? AND m.receiver_id = ?)
          OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`,
      [userId, otherUserId, otherUserId, userId]
    );

    // Mark received messages as read
    await db.query(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
      [otherUserId, userId]
    );

    res.json({
      partner,
      messages
    });
  } catch (error) {
    console.error('Error fetching message thread:', error);
    res.status(500).json({ message: 'Failed to retrieve messages.' });
  }
});

// 3. Send direct message
router.post('/', async (req, res) => {
  const senderId = req.user.id;
  const { receiver_id, content } = req.body;

  if (!receiver_id || !content || !content.trim()) {
    return res.status(400).json({ message: 'Receiver and non-empty content are required.' });
  }

  if (parseInt(receiver_id) === senderId) {
    return res.status(400).json({ message: 'You cannot send a message to yourself.' });
  }

  try {
    // Verify receiver exists
    const [receivers] = await db.query('SELECT id, username FROM users WHERE id = ?', [receiver_id]);
    if (receivers.length === 0) {
      return res.status(404).json({ message: 'Receiver user does not exist.' });
    }

    const [result] = await db.query(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
      [senderId, receiver_id, content.trim()]
    );

    // Create notification for receiver
    await db.query(
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
      [
        receiver_id,
        'message',
        `New Message from ${req.user.username}`,
        content.trim().length > 60 ? content.trim().substring(0, 60) + '...' : content.trim(),
        `messages:${senderId}`
      ]
    );

    res.status(201).json({
      message: 'Message sent successfully!',
      messageId: result.insertId
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message.' });
  }
});

module.exports = router;
