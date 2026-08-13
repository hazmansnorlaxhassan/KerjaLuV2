const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../auth-middleware');

router.use(authenticateToken);

// 1. Get Wallet Balance and Transaction History
router.get('/', async (req, res) => {
  const userId = req.user.id;

  try {
    const [[user]] = await db.query('SELECT balance FROM users WHERE id = ?', [userId]);
    const [transactions] = await db.query(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );

    res.json({
      balance: parseFloat(user.balance || 0).toFixed(2),
      transactions
    });
  } catch (error) {
    console.error('Error fetching wallet data:', error);
    res.status(500).json({ message: 'Failed to retrieve wallet information.' });
  }
});

// 2. Deposit Funds (Mock Payment Checkout)
router.post('/deposit', async (req, res) => {
  const userId = req.user.id;
  const { amount } = req.body;

  const depositAmount = parseFloat(amount);
  if (isNaN(depositAmount) || depositAmount <= 0) {
    return res.status(400).json({ message: 'Invalid deposit amount.' });
  }

  try {
    // Increment user balance
    await db.query('UPDATE users SET balance = balance + ? WHERE id = ?', [depositAmount, userId]);

    // Record transaction
    await db.query(
      'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)',
      [userId, 'deposit', depositAmount, `Deposited RM ${depositAmount.toFixed(2)} via Mock Gateway`]
    );

    // Notify user
    await db.query(
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
      [
        userId,
        'wallet',
        'Deposit Successful!',
        `Your wallet was credited with RM ${depositAmount.toFixed(2)}.`,
        'wallet'
      ]
    );

    const [[updatedUser]] = await db.query('SELECT balance FROM users WHERE id = ?', [userId]);

    res.json({
      message: `Successfully deposited RM ${depositAmount.toFixed(2)}!`,
      newBalance: parseFloat(updatedUser.balance).toFixed(2)
    });
  } catch (error) {
    console.error('Error depositing funds:', error);
    res.status(500).json({ message: 'Failed to complete deposit.' });
  }
});

module.exports = router;
