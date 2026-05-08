/**
 * AGRISAVE.IO - Auth Controller
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet } = require('../config/database');
const { sha256Hash, generateSecureToken } = require('../utils/crypto');
const { createAuditLog, getClientIp } = require('../services/auditService');
const logger = require('../utils/logger');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const login = async (req, res) => {
  const { username, password } = req.body;
  const ip = getClientIp(req);
  const ua = req.headers['user-agent'] || 'unknown';

  try {
    const user = await dbGet('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);

    if (!user) {
      await createAuditLog({ action: 'FAILED_LOGIN', username, ipAddress: ip, ua, status: 'FAILED', detail: { reason: 'USER_NOT_FOUND' } });
      return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Username atau password salah.' });
    }

    // Cek lockout
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      const min = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({ success: false, error: 'ACCOUNT_LOCKED', message: `Akun dikunci. Coba lagi dalam ${min} menit.` });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      const attempts = user.login_attempts + 1;
      const lockUntil = attempts >= MAX_LOGIN_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString()
        : null;
      await dbRun('UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?', [attempts, lockUntil, user.id]);
      await createAuditLog({ userId: user.id, username: user.username, role: user.role, action: 'FAILED_LOGIN', ipAddress: ip, ua, status: 'FAILED', detail: { attempts } });
      return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Username atau password salah.', attemptsLeft: Math.max(0, MAX_LOGIN_ATTEMPTS - attempts) });
    }

    // Reset attempts & update last_login
    await dbRun('UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = ? WHERE id = ?', [new Date().toISOString(), user.id]);

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
    const rawRefresh = generateSecureToken(48);
    const refreshHash = sha256Hash(rawRefresh);
    const expiry = new Date(Date.now() + 7 * 24 * 3600000).toISOString();
    await dbRun('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, ip_address, user_agent) VALUES (?,?,?,?,?,?)',
      [uuidv4(), user.id, refreshHash, expiry, ip, ua]);

    await createAuditLog({ userId: user.id, username: user.username, role: user.role, action: 'LOGIN', targetType: 'system', ipAddress: ip, ua, status: 'SUCCESS' });

    res.cookie('refreshToken', rawRefresh, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict', maxAge: 7 * 24 * 3600000, path: '/api/auth/refresh'
    });

    res.json({
      success: true, message: 'Login berhasil.',
      data: { accessToken, user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role } }
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ success: false, error: 'LOGIN_ERROR' });
  }
};

const register = async (req, res) => {
  const { username, email, password, full_name, role = 'OPERATOR' } = req.body;
  const ip = getClientIp(req);
  try {
    const existing = await dbGet('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing) return res.status(409).json({ success: false, error: 'DUPLICATE_USER', message: 'Username atau email sudah terdaftar.' });

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const id = uuidv4();
    await dbRun('INSERT INTO users (id, username, email, password_hash, full_name, role) VALUES (?,?,?,?,?,?)',
      [id, username, email, password_hash, full_name, role]);

    await createAuditLog({ userId: req.user?.id, username: req.user?.username || 'PUBLIC', role: req.user?.role,
      action: 'USER_CREATED', targetType: 'user', targetId: id, ipAddress: ip, status: 'SUCCESS',
      detail: { newUser: username, newRole: role } });

    res.status(201).json({ success: true, message: 'Akun berhasil dibuat.', data: { id, username, email, full_name, role } });
  } catch (err) {
    logger.error('Register error:', err);
    res.status(500).json({ success: false, error: 'REGISTER_ERROR' });
  }
};

const refreshToken = async (req, res) => {
  const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!rawToken) return res.status(401).json({ success: false, error: 'NO_REFRESH_TOKEN' });

  try {
    const hash = sha256Hash(rawToken);
    const stored = await dbGet(
      `SELECT rt.*, u.role, u.username, u.is_active FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id WHERE rt.token_hash = ? AND rt.is_revoked = 0`, [hash]);

    if (!stored || !stored.is_active) return res.status(401).json({ success: false, error: 'INVALID_REFRESH_TOKEN' });
    if (new Date() > new Date(stored.expires_at)) {
      await dbRun('UPDATE refresh_tokens SET is_revoked = 1 WHERE token_hash = ?', [hash]);
      return res.status(401).json({ success: false, error: 'REFRESH_TOKEN_EXPIRED' });
    }

    const accessToken = jwt.sign(
      { userId: stored.user_id, username: stored.username, role: stored.role },
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    logger.error('Refresh error:', err);
    res.status(500).json({ success: false, error: 'REFRESH_ERROR' });
  }
};

const logout = async (req, res) => {
  const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
  try {
    if (rawToken) await dbRun('UPDATE refresh_tokens SET is_revoked = 1 WHERE token_hash = ?', [sha256Hash(rawToken)]);
    if (req.user) await createAuditLog({ userId: req.user.id, username: req.user.username, role: req.user.role,
      action: 'LOGOUT', targetType: 'system', ipAddress: getClientIp(req), status: 'SUCCESS' });
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    res.json({ success: true, message: 'Logout berhasil.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'LOGOUT_ERROR' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await dbGet('SELECT id, username, email, full_name, role, last_login, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'FETCH_USER_ERROR' });
  }
};

module.exports = { login, register, refreshToken, logout, getMe };
