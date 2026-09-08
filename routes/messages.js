const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../auth-middleware');

// Apply auth to all message routes
router.use(authenticateToken);

/**
 * Helper to generate a clean WhatsApp URL
 */
function buildWhatsAppUrl(phone, text) {
  const cleanPhone = (phone || '6738123456').replace(/[^0-9]/g, '');
  const targetNumber = cleanPhone.startsWith('673') ? cleanPhone : (cleanPhone.length === 7 ? '673' + cleanPhone : cleanPhone);
  return `https://wa.me/${targetNumber}?text=${encodeURIComponent(text || '')}`;
}

// 1. Get All Rows of Communication Records for Current User
router.get('/records', async (req, res) => {
  const userId = req.user.id;

  try {
    const [records] = await db.query(
      `SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.content,
        COALESCE(m.subject, 'Direct Inquiry') AS subject,
        COALESCE(m.channel, 'whatsapp') AS channel,
        m.whatsapp_url,
        COALESCE(m.status, 'logged') AS status,
        m.is_read,
        m.created_at,
        sender.username AS sender_username,
        sender.role AS sender_role,
        COALESCE(sender.phone, '+673 8123456') AS sender_phone,
        receiver.username AS receiver_username,
        receiver.role AS receiver_role,
        COALESCE(receiver.phone, '+673 8123456') AS receiver_phone,
        IF(m.sender_id = ?, 'outgoing', 'incoming') AS direction
       FROM messages m
       JOIN users sender ON m.sender_id = sender.id
       JOIN users receiver ON m.receiver_id = receiver.id
       WHERE m.sender_id = ? OR m.receiver_id = ?
       ORDER BY m.created_at DESC`,
      [userId, userId, userId]
    );

    const enrichedRecords = records.map(r => {
      const partnerPhone = r.direction === 'outgoing' ? r.receiver_phone : r.sender_phone;
      const partnerUsername = r.direction === 'outgoing' ? r.receiver_username : r.sender_username;
      const partnerRole = r.direction === 'outgoing' ? r.receiver_role : r.sender_role;
      const partnerId = r.direction === 'outgoing' ? r.receiver_id : r.sender_id;
      const directWaUrl = r.whatsapp_url || buildWhatsAppUrl(partnerPhone, r.content);

      return {
        ...r,
        partner_id: partnerId,
        partner_username: partnerUsername,
        partner_role: partnerRole,
        partner_phone: partnerPhone,
        whatsapp_url: directWaUrl
      };
    });

    res.json(enrichedRecords);
  } catch (error) {
    console.error('Error fetching communication records:', error);
    res.status(500).json({ message: 'Failed to retrieve communication records.' });
  }
});

/**
 * Check if two users have an approved connection (accepted application or gig order)
 */
async function hasApprovedConnection(userId1, userId2) {
  if (!userId1 || !userId2) return false;
  if (parseInt(userId1) === parseInt(userId2)) return false;

  // Admins can connect with anyone for moderation/support
  const [userRoles] = await db.query('SELECT id, role FROM users WHERE id IN (?, ?)', [userId1, userId2]);
  if (userRoles.some(u => u.role === 'admin')) {
    return true;
  }

  // 1. Check if there is an accepted job application between them
  const [appMatches] = await db.query(
    `SELECT ja.id 
     FROM job_applications ja 
     JOIN jobs j ON ja.job_id = j.id 
     WHERE ja.status = 'accepted' AND (
       (j.employer_id = ? AND ja.jobseeker_id = ?) OR 
       (j.employer_id = ? AND ja.jobseeker_id = ?)
     ) LIMIT 1`,
    [userId1, userId2, userId2, userId1]
  );
  if (appMatches.length > 0) return true;

  // 2. Check if there is a gig order between them
  const [orderMatches] = await db.query(
    `SELECT id FROM orders 
     WHERE ((buyer_id = ? AND seller_id = ?) OR (buyer_id = ? AND seller_id = ?)) 
     LIMIT 1`,
    [userId1, userId2, userId2, userId1]
  );
  if (orderMatches.length > 0) return true;

  return false;
}

// 2. Get Contacts List (Only approved connections can be contacted)
router.get('/contacts', async (req, res) => {
  const userId = req.user.id;

  try {
    let query = '';
    let params = [];

    if (req.user.role === 'admin') {
      query = `SELECT id, username, role, email, COALESCE(phone, '+673 8123456') AS phone 
               FROM users WHERE id != ? AND status = 'active' ORDER BY username ASC`;
      params = [userId];
    } else {
      query = `SELECT DISTINCT u.id, u.username, u.role, u.email, COALESCE(u.phone, '+673 8123456') AS phone 
               FROM users u 
               WHERE u.id != ? AND u.status = 'active' AND (
                 -- Approved job applications (req.user is employer, u is jobseeker)
                 EXISTS (
                   SELECT 1 FROM job_applications ja 
                   JOIN jobs j ON ja.job_id = j.id 
                   WHERE j.employer_id = ? AND ja.jobseeker_id = u.id AND ja.status = 'accepted'
                 )
                 OR
                 -- Approved job applications (req.user is jobseeker, u is employer)
                 EXISTS (
                   SELECT 1 FROM job_applications ja 
                   JOIN jobs j ON ja.job_id = j.id 
                   WHERE ja.jobseeker_id = ? AND j.employer_id = u.id AND ja.status = 'accepted'
                 )
                 OR
                 -- Gig orders between them
                 EXISTS (
                   SELECT 1 FROM orders o 
                   WHERE (o.buyer_id = ? AND o.seller_id = u.id) 
                      OR (o.seller_id = ? AND o.buyer_id = u.id)
                 )
               )
               ORDER BY u.username ASC`;
      params = [userId, userId, userId, userId, userId];
    }

    const [contacts] = await db.query(query, params);
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: 'Failed to retrieve contacts list.' });
  }
});

// 3. Get Specific User Details (for prefilling WhatsApp message)
router.get('/user-details/:otherUserId', async (req, res) => {
  const otherUserId = parseInt(req.params.otherUserId);

  try {
    const isAllowed = await hasApprovedConnection(req.user.id, otherUserId);
    if (!isAllowed) {
      return res.status(403).json({ 
        message: 'Direct WhatsApp communication is only unlocked once a job application is approved and accepted.' 
      });
    }

    const [users] = await db.query(
      `SELECT id, username, role, email, COALESCE(phone, '+673 8123456') AS phone 
       FROM users 
       WHERE id = ?`,
      [otherUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Failed to retrieve user details.' });
  }
});

// 4. Log Communication Record & Generate WhatsApp URL
router.post('/whatsapp', async (req, res) => {
  const senderId = req.user.id;
  const { receiver_id, message, content, subject } = req.body;
  const textContent = (message || content || '').trim();
  const topic = (subject || 'Direct Inquiry').trim();

  if (!receiver_id || !textContent) {
    return res.status(400).json({ message: 'Recipient and message content are required.' });
  }

  if (parseInt(receiver_id) === senderId) {
    return res.status(400).json({ message: 'Cannot start a WhatsApp conversation with yourself.' });
  }

  try {
    const isAllowed = await hasApprovedConnection(senderId, parseInt(receiver_id));
    if (!isAllowed) {
      return res.status(403).json({ 
        message: 'Direct WhatsApp communication is only unlocked once a job application is approved and accepted.' 
      });
    }

    const [receivers] = await db.query(
      'SELECT id, username, role, phone FROM users WHERE id = ?',
      [receiver_id]
    );

    if (receivers.length === 0) {
      return res.status(404).json({ message: 'Recipient user does not exist.' });
    }

    const receiver = receivers[0];
    const receiverPhone = receiver.phone || '+673 8123456';
    const whatsappUrl = buildWhatsAppUrl(receiverPhone, textContent);

    const [result] = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content, subject, channel, whatsapp_url, status)
       VALUES (?, ?, ?, ?, 'whatsapp', ?, 'logged')`,
      [senderId, receiver_id, textContent, topic, whatsappUrl]
    );

    // Create In-App Notification for Receiver
    await db.query(
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
      [
        receiver_id,
        'message',
        `WhatsApp Chat from ${req.user.username}`,
        `${topic}: ${textContent.length > 55 ? textContent.substring(0, 55) + '...' : textContent}`,
        `messages:${senderId}`
      ]
    );

    res.status(201).json({
      message: 'Communication record logged and WhatsApp link generated!',
      recordId: result.insertId,
      whatsappUrl,
      record: {
        id: result.insertId,
        sender_id: senderId,
        receiver_id: parseInt(receiver_id),
        content: textContent,
        subject: topic,
        channel: 'whatsapp',
        whatsapp_url: whatsappUrl,
        status: 'logged',
        partner_username: receiver.username,
        partner_phone: receiverPhone,
        created_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error recording WhatsApp communication:', error);
    res.status(500).json({ message: 'Failed to record communication.' });
  }
});

// 5. Traditional Send Message (Backwards Compatible - also logs and creates WhatsApp URL)
router.post('/', async (req, res) => {
  const senderId = req.user.id;
  const { receiver_id, content, subject } = req.body;

  if (!receiver_id || !content || !content.trim()) {
    return res.status(400).json({ message: 'Receiver and non-empty content are required.' });
  }

  if (parseInt(receiver_id) === senderId) {
    return res.status(400).json({ message: 'You cannot send a message to yourself.' });
  }

  try {
    const [receivers] = await db.query(
      'SELECT id, username, phone FROM users WHERE id = ?',
      [receiver_id]
    );

    if (receivers.length === 0) {
      return res.status(404).json({ message: 'Receiver user does not exist.' });
    }

    const receiverPhone = receivers[0].phone || '+673 8123456';
    const whatsappUrl = buildWhatsAppUrl(receiverPhone, content.trim());
    const topic = (subject || 'Direct Inquiry').trim();

    const [result] = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content, subject, channel, whatsapp_url, status)
       VALUES (?, ?, ?, ?, 'whatsapp', ?, 'logged')`,
      [senderId, receiver_id, content.trim(), topic, whatsappUrl]
    );

    await db.query(
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
      [
        receiver_id,
        'message',
        `WhatsApp Message from ${req.user.username}`,
        content.trim().length > 60 ? content.trim().substring(0, 60) + '...' : content.trim(),
        `messages:${senderId}`
      ]
    );

    res.status(201).json({
      message: 'Message logged successfully!',
      messageId: result.insertId,
      whatsappUrl
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message.' });
  }
});

// 6. Get User's Conversation Threads (Backwards Compatible)
router.get('/conversations', async (req, res) => {
  const userId = req.user.id;

  try {
    const [conversations] = await db.query(
      `SELECT 
        u.id AS other_user_id,
        u.username AS other_username,
        u.email AS other_email,
        u.role AS other_role,
        COALESCE(u.phone, '+673 8123456') AS other_phone,
        m.content AS last_message,
        COALESCE(m.subject, 'Direct Inquiry') AS last_subject,
        m.created_at AS last_message_time,
        m.sender_id AS last_sender_id,
        m.whatsapp_url,
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

// 7. Get Message Thread with a Specific User (Backwards Compatible)
router.get('/thread/:otherUserId', async (req, res) => {
  const userId = req.user.id;
  const otherUserId = req.params.otherUserId;

  try {
    const [partners] = await db.query(
      'SELECT id, username, role, COALESCE(phone, \'+673 8123456\') AS phone FROM users WHERE id = ?',
      [otherUserId]
    );

    if (partners.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const partner = partners[0];

    const [messages] = await db.query(
      `SELECT m.*, u.username AS sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = ? AND m.receiver_id = ?)
          OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`,
      [userId, otherUserId, otherUserId, userId]
    );

    await db.query(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
      [otherUserId, userId]
    );

    const directWhatsAppUrl = buildWhatsAppUrl(partner.phone, `Hi ${partner.username}, I am messaging you from KerjaLu.`);

    res.json({
      partner: {
        ...partner,
        whatsapp_url: directWhatsAppUrl
      },
      messages
    });
  } catch (error) {
    console.error('Error fetching message thread:', error);
    res.status(500).json({ message: 'Failed to retrieve messages.' });
  }
});

router.hasApprovedConnection = hasApprovedConnection;
module.exports = router;
