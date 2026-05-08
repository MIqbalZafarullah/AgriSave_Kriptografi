/**
 * AGRISAVE.IO - Express Server Entry Point
 *
 * Security stack:
 * - Helmet (secure HTTP headers)
 * - CORS (whitelist frontend)
 * - Rate limiting (global + per-route)
 * - Morgan (HTTP access logging)
 * - cookie-parser (HttpOnly cookie support)
 * - express.json (body parsing dengan size limit)
 * - Centralized error handler
 */
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const auditRoutes = require('./routes/audit');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────────────
// SECURITY MIDDLEWARE
// ─────────────────────────────────────────────────────

// 1. Helmet: Set secure HTTP headers
//    - X-Content-Type-Options: nosniff
//    - X-Frame-Options: DENY
//    - Strict-Transport-Security
//    - Content-Security-Policy
//    - X-XSS-Protection
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// 2. CORS: Hanya izinkan frontend yang terdaftar
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:3000',
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} tidak diizinkan.`));
    }
  },
  credentials: true, // Untuk HttpOnly cookie
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 3. Global rate limiter (100 req / 15 menit per IP)
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'RATE_LIMIT_EXCEEDED', message: 'Terlalu banyak permintaan. Coba lagi nanti.' },
});
app.use('/api/', globalLimiter);

// ─────────────────────────────────────────────────────
// GENERAL MIDDLEWARE
// ─────────────────────────────────────────────────────

// HTTP access log
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// Body parsing dengan ukuran limit (mencegah DoS via large payload)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Cookie parser untuk refresh token HttpOnly
app.use(cookieParser());

// ─────────────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    system: 'AGRISAVE.IO',
    version: '2.0.0',
    status: 'OPERATIONAL',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/admin', adminRoutes);

// ─────────────────────────────────────────────────────
// ERROR HANDLERS
// ─────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info('═══════════════════════════════════════════════');
  logger.info(`  AGRISAVE.IO Backend - v2.0.0`);
  logger.info(`  Mode    : ${process.env.NODE_ENV || 'development'}`);
  logger.info(`  Port    : ${PORT}`);
  logger.info(`  API URL : http://localhost:${PORT}/api`);
  logger.info('═══════════════════════════════════════════════');
});

module.exports = app;
