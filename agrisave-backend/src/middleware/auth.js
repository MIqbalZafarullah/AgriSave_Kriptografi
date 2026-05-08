/**
 * AGRISAVE.IO - Authentication Middleware
 * 
 * Verifikasi JWT Access Token dari Authorization header.
 * Menggunakan HttpOnly Cookie sebagai fallback.
 */
const jwt = require('jsonwebtoken');
const { dbGet } = require('../config/database');
const { createAuditLog } = require('../services/auditService');
const logger = require('../utils/logger');

/**
 * Middleware: Verifikasi JWT Access Token
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Ambil token dari Authorization header atau cookie
    const authHeader = req.headers['authorization'];
    const token =
      (authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null) || req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'Token autentikasi tidak ditemukan.',
      });
    }

    // Verifikasi JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Cek user masih ada & aktif di database
    const user = await dbGet(
      'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'USER_INACTIVE',
        message: 'Akun tidak ditemukan atau telah dinonaktifkan.',
      });
    }

    // Attach user info ke request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Sesi telah berakhir. Silakan login ulang.',
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Token tidak valid.',
      });
    }
    logger.error('Auth middleware error:', err);
    res.status(500).json({ success: false, error: 'AUTH_ERROR' });
  }
};

/**
 * Middleware Factory: Role-Based Access Control (RBAC)
 * 
 * Hierarki role (dari tertinggi ke terendah):
 * SUPER_ADMIN > ADMIN > OPERATOR > VIEWER
 * 
 * @param {...string} allowedRoles - Role yang diizinkan
 * @returns {Function} Express middleware
 */
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Autentikasi diperlukan.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Log unauthorized access attempt
      logger.warn(
        `Unauthorized access attempt: ${req.user.username} (${req.user.role}) → ${req.method} ${req.path} [Required: ${allowedRoles.join(',')}]`
      );

      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: `Akses ditolak. Role ${req.user.role} tidak memiliki izin untuk operasi ini.`,
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
};

/**
 * Helper: Role hierarchy check
 * Memungkinkan "role atau lebih tinggi" access
 */
const ROLE_HIERARCHY = { VIEWER: 1, OPERATOR: 2, ADMIN: 3, SUPER_ADMIN: 4 };

const authorizeMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED' });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 999;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: `Akses minimum role: ${minRole}`,
      });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRole, authorizeMinRole };
