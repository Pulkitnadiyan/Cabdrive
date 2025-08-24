const express = require('express');
const Driver = require('./models/Driver');
const User = require('./models/User');
const router = express.Router();

// Middleware for JWT authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.sendStatus(401);
  const token = authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Endpoint to handle fine payments directly
router.post('/pay-fine', async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        
        // Simulating a successful payment by resetting the fine to 0
        user.outstandingFine = 0;
        await user.save();

        res.json({ success: true, message: 'Fine paid successfully.' });
    } catch (error) {
        console.error("Error paying fine:", error);
        res.status(500).json({ error: 'Failed to process fine payment.' });
    }
});

module.exports = router;
