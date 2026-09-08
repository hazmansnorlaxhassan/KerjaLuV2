const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../auth-middleware');

// 1. Get all gigs (Freelance services)
router.get('/', authenticateToken, async (req, res) => {
  const { category, search } = req.query;
  let sql = `
    SELECT g.*, u.username AS jobseeker_name, u.latitude, u.longitude 
    FROM gigs g 
    JOIN users u ON g.jobseeker_id = u.id
    WHERE u.status = 'active'
  `;
  const params = [];

  if (category) {
    sql += ' AND g.category = ?';
    params.push(category);
  }

  if (search) {
    sql += ' AND (g.title LIKE ? OR g.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY g.created_at DESC';

  try {
    const [gigs] = await db.query(sql, params);
    res.json(gigs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve gigs.' });
  }
});

// 2. Post a freelance service gig (Jobseeker only)
router.post('/', authenticateToken, requireRole('jobseeker'), async (req, res) => {
  const { title, description, price, delivery_days, category } = req.body;

  if (!title || !description || !price || !delivery_days || !category) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    await db.query(
      'INSERT INTO gigs (jobseeker_id, title, description, price, delivery_days, category) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description, price, delivery_days, category]
    );
    res.status(201).json({ message: 'Freelance service gig created successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create gig.' });
  }
});

// 3. Get current Jobseeker's own posted gigs
router.get('/my-gigs', authenticateToken, requireRole('jobseeker'), async (req, res) => {
  try {
    const [gigs] = await db.query(
      'SELECT * FROM gigs WHERE jobseeker_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(gigs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve your gigs.' });
  }
});

// Get gigs (freelance services) based on proximity (Haversine formula)
router.get('/proximity', authenticateToken, async (req, res) => {
  let lat = req.query.lat ? parseFloat(req.query.lat) : req.user.latitude;
  let lng = req.query.lng ? parseFloat(req.query.lng) : req.user.longitude;
  const radius = req.query.radius ? parseFloat(req.query.radius) : 10; // default 10 km
  const { category, search } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ message: 'Location coordinate parameters (lat, lng) are required.' });
  }

  const params = [lat, lng, lat];
  let sql = `
    SELECT g.*, u.username AS jobseeker_name, u.latitude, u.longitude,
      (6371 * acos(cos(radians(?)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians(?)) + sin(radians(?)) * sin(radians(u.latitude)))) AS distance
    FROM gigs g
    JOIN users u ON g.jobseeker_id = u.id
    WHERE u.status = 'active'
  `;

  if (category) {
    sql += ' AND g.category = ?';
    params.push(category);
  }

  if (search) {
    sql += ' AND (g.title LIKE ? OR g.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' HAVING distance <= ? ORDER BY distance ASC';
  params.push(radius);

  try {
    const [gigs] = await db.query(sql, params);
    res.json(gigs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve gigs by proximity.' });
  }
});

// 4. Order/Buy a gig (Any logged-in user can buy, except the seller themselves)
router.post('/:id/order', authenticateToken, async (req, res) => {
  const gigId = req.params.id;
  const buyerId = req.user.id;

  try {
    // Get gig details
    const [gigs] = await db.query('SELECT * FROM gigs WHERE id = ?', [gigId]);
    if (gigs.length === 0) {
      return res.status(404).json({ message: 'Gig not found.' });
    }

    const gig = gigs[0];

    // Prevent ordering own gig
    if (gig.jobseeker_id === buyerId) {
      return res.status(400).json({ message: 'You cannot purchase your own freelance service.' });
    }

    const orderPrice = parseFloat(gig.price);

    // Check buyer's balance
    const [[buyer]] = await db.query('SELECT balance FROM users WHERE id = ?', [buyerId]);
    const currentBalance = parseFloat(buyer.balance || 0);

    if (currentBalance < orderPrice) {
      return res.status(400).json({
        message: `Insufficient wallet balance. Total required: BND ${orderPrice.toFixed(2)}, Available balance: BND ${currentBalance.toFixed(2)}. Please top up your wallet.`
      });
    }

    // Deduct balance & record Escrow Hold
    await db.query('UPDATE users SET balance = balance - ? WHERE id = ?', [orderPrice, buyerId]);
    await db.query(
      'INSERT INTO transactions (user_id, type, amount, reference_type, reference_id, description) VALUES (?, ?, ?, ?, ?, ?)',
      [buyerId, 'escrow_hold', orderPrice, 'gig', gigId, `Escrow Hold for purchasing gig: "${gig.title}"`]
    );

    // Create order
    const [orderResult] = await db.query(
      'INSERT INTO orders (gig_id, buyer_id, seller_id, price, status) VALUES (?, ?, ?, ?, ?)',
      [gigId, buyerId, gig.jobseeker_id, orderPrice, 'pending']
    );

    // Send Notification to Seller
    await db.query(
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
      [
        gig.jobseeker_id,
        'order',
        'New Gig Order Placed!',
        `${req.user.username} purchased your gig "${gig.title}" for BND ${orderPrice.toFixed(2)}. Funds are held in Escrow.`,
        'orders:sales'
      ]
    );

    res.status(201).json({ message: 'Order placed successfully! Funds have been secured in Escrow.' });
  } catch (error) {
    console.error('Error placing gig order:', error);
    res.status(500).json({ message: 'Failed to place order.' });
  }
});

// 5. Get purchase orders (what the current user has bought)
router.get('/orders/purchases', authenticateToken, async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.*, g.title AS gig_title, u.username AS seller_name 
       FROM orders o 
       JOIN gigs g ON o.gig_id = g.id 
       JOIN users u ON o.seller_id = u.id 
       WHERE o.buyer_id = ? 
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve purchase orders.' });
  }
});

// 6. Get sales orders (gigs that others bought from the current jobseeker)
router.get('/orders/sales', authenticateToken, requireRole('jobseeker'), async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.*, g.title AS gig_title, u.username AS buyer_name 
       FROM orders o 
       JOIN gigs g ON o.gig_id = g.id 
       JOIN users u ON o.buyer_id = u.id 
       WHERE o.seller_id = ? 
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve sales orders.' });
  }
});

// 7. Update order status (Can be updated by seller, or cancelled by buyer if pending)
router.post('/orders/:id/status', authenticateToken, async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body; // 'in_progress', 'completed', 'cancelled'

  if (!['in_progress', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  try {
    // Get order details
    const [orders] = await db.query('SELECT o.*, g.title AS gig_title FROM orders o JOIN gigs g ON o.gig_id = g.id WHERE o.id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const order = orders[0];
    const oldStatus = order.status;

    if (oldStatus === 'completed') {
      return res.status(400).json({ message: 'Completed orders cannot change status.' });
    }

    if (oldStatus === 'cancelled') {
      return res.status(400).json({ message: 'Cancelled orders cannot change status.' });
    }

    // Status logic
    if (status === 'cancelled') {
      // Buyer can cancel if pending. Seller can cancel at any point before completion.
      if (req.user.id !== order.buyer_id && req.user.id !== order.seller_id) {
        return res.status(403).json({ message: 'Unauthorized.' });
      }
      if (req.user.id === order.buyer_id && order.status !== 'pending') {
        return res.status(400).json({ message: 'You can only cancel an order that is still pending.' });
      }

      // Refund buyer balance
      const refundAmount = parseFloat(order.price);
      await db.query('UPDATE users SET balance = balance + ? WHERE id = ?', [refundAmount, order.buyer_id]);
      await db.query(
        'INSERT INTO transactions (user_id, type, amount, reference_type, reference_id, description) VALUES (?, ?, ?, ?, ?, ?)',
        [order.buyer_id, 'refund', refundAmount, 'order', orderId, `Refund for cancelled order: "${order.gig_title}"`]
      );

      // Notify Buyer & Seller
      await db.query(
        'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
        [
          order.buyer_id,
          'order',
          'Order Cancelled & Refunded',
          `Order #${orderId} for "${order.gig_title}" was cancelled. BND ${refundAmount.toFixed(2)} has been refunded to your wallet.`,
          'orders:purchases'
        ]
      );
    } else {
      // Only seller can change to in_progress or completed
      if (req.user.id !== order.seller_id) {
        return res.status(403).json({ message: 'Only the seller can update order progress.' });
      }

      if (status === 'completed') {
        // Release funds to seller
        const releaseAmount = parseFloat(order.price);
        await db.query('UPDATE users SET balance = balance + ? WHERE id = ?', [releaseAmount, order.seller_id]);
        await db.query(
          'INSERT INTO transactions (user_id, type, amount, reference_type, reference_id, description) VALUES (?, ?, ?, ?, ?, ?)',
          [order.seller_id, 'escrow_release', releaseAmount, 'order', orderId, `Earnings released for completed order: "${order.gig_title}"`]
        );

        // Notify Buyer to leave review
        await db.query(
          'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
          [
            order.buyer_id,
            'order',
            'Order Delivered & Completed!',
            `Order #${orderId} for "${order.gig_title}" has been completed! Please leave a review for the freelancer.`,
            'orders:purchases'
          ]
        );
      } else if (status === 'in_progress') {
        // Notify Buyer
        await db.query(
          'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
          [
            order.buyer_id,
            'order',
            'Order In Progress',
            `Seller started working on order #${orderId} ("${order.gig_title}").`,
            'orders:purchases'
          ]
        );
      }
    }

    // Update order status
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
    res.json({ message: `Order status updated to ${status}.` });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Failed to update order status.' });
  }
});

module.exports = router;
