/**
 * AGRISAVE.IO - Admin Controller
 * SUPER_ADMIN only endpoints: user management
 */
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet, dbAll } = require('../config/database');
const { createAuditLog, getClientIp } = require('../services/auditService');
const logger = require('../utils/logger');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

/** GET /api/admin/users */
const getUsers = async (req, res) => {
  try {
    const users = await dbAll(
      `SELECT id, username, email, full_name, role, is_active, last_login, login_attempts, locked_until, created_at
       FROM users ORDER BY created_at DESC`, []
    );
    res.json({ success: true, data: users });
  } catch (err) {
    logger.error('getUsers error:', err);
    res.status(500).json({ success: false, error: 'FETCH_USERS_ERROR' });
  }
};

/** PUT /api/admin/users/:id/role */
const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const ip = getClientIp(req);
  const validRoles = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER'];
  if (!validRoles.includes(role)) return res.status(400).json({ success: false, error: 'INVALID_ROLE' });

  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    if (id === req.user.id) return res.status(400).json({ success: false, error: 'SELF_ROLE_CHANGE', message: 'Tidak bisa mengubah role sendiri.' });

    await dbRun("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?", [role, id]);
    await createAuditLog({ userId: req.user.id, username: req.user.username, role: req.user.role,
      action: 'USER_ROLE_CHANGED', targetType: 'user', targetId: id,
      ipAddress: ip, status: 'SUCCESS', detail: { from: user.role, to: role, targetUser: user.username } });

    res.json({ success: true, message: `Role ${user.username} diubah menjadi ${role}.` });
  } catch (err) {
    logger.error('updateUserRole error:', err);
    res.status(500).json({ success: false, error: 'UPDATE_ROLE_ERROR' });
  }
};

/** PUT /api/admin/users/:id/toggle-active */
const toggleUserActive = async (req, res) => {
  const { id } = req.params;
  const ip = getClientIp(req);
  if (id === req.user.id) return res.status(400).json({ success: false, error: 'SELF_DEACTIVATE' });

  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ success: false, error: 'NOT_FOUND' });

    const newStatus = user.is_active ? 0 : 1;
    await dbRun("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?", [newStatus, id]);
    await createAuditLog({ userId: req.user.id, username: req.user.username, role: req.user.role,
      action: newStatus ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', targetType: 'user', targetId: id,
      ipAddress: ip, status: 'SUCCESS', detail: { targetUser: user.username } });

    res.json({ success: true, message: `User ${user.username} ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'TOGGLE_USER_ERROR' });
  }
};

/** POST /api/admin/users/:id/unlock */
const unlockUser = async (req, res) => {
  const { id } = req.params;
  try {
    await dbRun("UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?", [id]);
    res.json({ success: true, message: 'Akun berhasil dibuka kuncinya.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'UNLOCK_ERROR' });
  }
};

/** GET /api/admin/stats */
const getDashboardStats = async (req, res) => {
  try {
    const { dbAll: all, dbGet: get } = require('../config/database');
    const [txStats, userStats, recentLogs, overdueCount] = await Promise.all([
      get(`SELECT SUM(CASE WHEN meta_jenis='Modal' THEN meta_nominal ELSE 0 END) as total_modal,
              SUM(CASE WHEN meta_jenis='Panen' THEN meta_nominal ELSE 0 END) as total_panen,
              COUNT(*) as total_records FROM transactions WHERE is_deleted = 0`, []),
      get(`SELECT COUNT(*) as total, SUM(CASE WHEN is_active=1 THEN 1 ELSE 0 END) as active,
              SUM(CASE WHEN role='SUPER_ADMIN' THEN 1 ELSE 0 END) as super_admins,
              SUM(CASE WHEN role='ADMIN' THEN 1 ELSE 0 END) as admins,
              SUM(CASE WHEN role='OPERATOR' THEN 1 ELSE 0 END) as operators,
              SUM(CASE WHEN role='VIEWER' THEN 1 ELSE 0 END) as viewers FROM users`, []),
      all(`SELECT username, role, action, status, created_at FROM audit_logs
              ORDER BY created_at DESC LIMIT 10`, []),
      get(`SELECT COUNT(*) as count FROM transactions
              WHERE is_deleted=0 AND meta_jenis='Modal'
              AND meta_tenggat IS NOT NULL AND meta_tenggat < date('now')`, []),
    ]);
    res.json({
      success: true,
      data: { transactions: txStats, users: userStats, recentActivity: recentLogs, overdueCount: overdueCount.count }
    });
  } catch (err) {
    logger.error('getDashboardStats error:', err);
    res.status(500).json({ success: false, error: 'STATS_ERROR' });
  }
};

module.exports = { getUsers, updateUserRole, toggleUserActive, unlockUser, getDashboardStats };
