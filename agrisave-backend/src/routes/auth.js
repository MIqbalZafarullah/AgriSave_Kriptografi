const express = require('express');
const router = express.Router();
const { login, register, refreshToken, logout, getMe } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { loginValidator, registerValidator } = require('../middleware/validators');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
  message: { success: false, error: 'TOO_MANY_ATTEMPTS', message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
  standardHeaders: true, legacyHeaders: false,
});

router.post('/login', loginLimiter, loginValidator, login);
router.post('/register', registerValidator, register);
router.post('/refresh', refreshToken);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMe);

module.exports = router;
