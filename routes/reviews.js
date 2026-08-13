const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../auth-middleware');

// 1. Get reviews for a specific gig (Public)
router.get('/gig/:gigId', async (req, res) => {
  const gigId = req.params.gigId;

  try {
    const [reviews] = await db.query(
      `SELECT r.*, u.username AS reviewer_name
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.gig_id = ?
       ORDER BY r.created_at DESC`,
      [gigId]
    );

    const [[{ avg_rating, total_reviews }]] = await db.query(
      `SELECT COALESCE(AVG(rating), 0) AS avg_rating, COUNT(*) AS total_reviews
       FROM reviews
       WHERE gig_id = ?`,
      [gigId]
    );

    res.json({
      reviews,
      avgRating: parseFloat(avg_rating).toFixed(1),
      totalReviews: total_reviews
    });
  } catch (error) {
    console.error('Error fetching gig reviews:', error);
    res.status(500).json({ message: 'Failed to retrieve reviews.' });
  }
});

// 2. Get reviews for a user (Public)
router.get('/user/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const [reviews] = await db.query(
      `SELECT r.*, u.username AS reviewer_name, g.title AS gig_title
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       LEFT JOIN gigs g ON r.gig_id = g.id
       WHERE r.reviewee_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    const [[{ avg_rating, total_reviews }]] = await db.query(
      `SELECT COALESCE(AVG(rating), 0) AS avg_rating, COUNT(*) AS total_reviews
       FROM reviews
       WHERE reviewee_id = ?`,
      [userId]
    );

    res.json({
      reviews,
      avgRating: parseFloat(avg_rating).toFixed(1),
      totalReviews: total_reviews
    });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ message: 'Failed to retrieve reviews.' });
  }
});

// 3. Post a review for a completed order (Authenticated)
router.post('/', authenticateToken, async (req, res) => {
  const reviewerId = req.user.id;
  const { order_id, rating, comment } = req.body;

  if (!order_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Order ID and a valid rating (1-5) are required.' });
  }

  try {
    // Check order status and details
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [order_id]);
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const order = orders[0];

    if (order.status !== 'completed') {
      return res.status(400).json({ message: 'Reviews can only be left for completed orders.' });
    }

    // Determine reviewee (if buyer reviews, reviewee is seller; if seller reviews, reviewee is buyer)
    let revieweeId;
    if (order.buyer_id === reviewerId) {
      revieweeId = order.seller_id;
    } else if (order.seller_id === reviewerId) {
      revieweeId = order.buyer_id;
    } else {
      return res.status(403).json({ message: 'You are not part of this order transaction.' });
    }

    // Check if user already reviewed this order
    const [existing] = await db.query(
      'SELECT id FROM reviews WHERE order_id = ? AND reviewer_id = ?',
      [order_id, reviewerId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'You have already submitted a review for this order.' });
    }

    // Insert review
    await db.query(
      'INSERT INTO reviews (order_id, reviewer_id, reviewee_id, gig_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)',
      [order_id, reviewerId, revieweeId, order.gig_id, rating, comment || '']
    );

    // Notify reviewee
    await db.query(
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
      [
        revieweeId,
        'review',
        'New Rating Received!',
        `${req.user.username} gave you a ${rating}-star rating.`,
        `portfolio:${revieweeId}`
      ]
    );

    res.status(201).json({ message: 'Thank you! Review submitted successfully.' });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ message: 'Failed to submit review.' });
  }
});

module.exports = router;
