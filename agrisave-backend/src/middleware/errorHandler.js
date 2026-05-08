/**
 * AGRISAVE.IO - Error Handler Middleware
 * Centralized error handling — mencegah stack trace bocor ke client.
 */
const logger = require('../utils/logger');

/**
 * 404 Handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} tidak ditemukan.`,
  });
};

/**
 * Global Error Handler
 * Express mendeteksi ini sebagai error handler karena memiliki 4 parameter (err, req, res, next)
 */
const errorHandler = (err, req, res, next) => {
  // Log error internal (JANGAN expose ke client)
  logger.error(`[${req.method}] ${req.path} →`, err);

  // Validation errors dari express-validator
  if (err.type === 'VALIDATION_ERROR') {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Input tidak valid.',
      details: err.errors,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'TOKEN_ERROR',
      message: 'Token tidak valid atau kadaluarsa.',
    });
  }

  // Database unique constraint
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    const field = err.message.split('.').pop();
    return res.status(409).json({
      success: false,
      error: 'DUPLICATE_ENTRY',
      message: `Data dengan ${field} tersebut sudah terdaftar.`,
    });
  }

  // Default: Internal Server Error (tidak expose detail)
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Terjadi kesalahan internal. Silakan coba lagi.',
  });
};

module.exports = { notFoundHandler, errorHandler };
