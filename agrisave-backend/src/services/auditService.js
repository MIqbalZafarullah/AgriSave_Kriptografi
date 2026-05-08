/**
 * AGRISAVE.IO - Audit Log Service
 * 
 * Mencatat SEMUA aktivitas sistem:
 * LOGIN, LOGOUT, DECRYPT, ADD_TX, EDIT_TX, DELETE_TX,
 * FAILED_LOGIN, FAILED_DECRYPT, REGISTER, USER_CREATED, dll.
 * 
 * Audit log bersifat IMMUTABLE (tidak boleh diedit/dihapus).
 */
const { v4: uuidv4 } = require('uuid');
const { dbRun, dbAll, dbGet } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Buat satu entri audit log
 * 
 * @param {object} params
 * @param {string} params.userId - ID user (null jika unauthenticated)
 * @param {string} params.username - Username
 * @param {string} params.role - Role user
 * @param {string} params.action - Aksi: LOGIN, DECRYPT, ADD_TX, dsb.
 * @param {string} params.targetType - 'transaction' | 'user' | 'system'
 * @param {string} params.targetId - ID record yang diakses
 * @param {string} params.ipAddress - IP address client
 * @param {string} params.userAgent - User-Agent header
 * @param {string} params.status - 'SUCCESS' | 'FAILED' | 'WARNING'
 * @param {object} params.detail - Detail tambahan (disimpan sebagai JSON)
 */
const createAuditLog = async ({
  userId = null,
  username = 'SYSTEM',
  role = null,
  action,
  targetType = null,
  targetId = null,
  ipAddress = '0.0.0.0',
  userAgent = null,
  status = 'SUCCESS',
  detail = null,
}) => {
  try {
    await dbRun(
      `INSERT INTO audit_logs 
        (id, user_id, username, role, action, target_type, target_id, ip_address, user_agent, status, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        userId,
        username,
        role,
        action,
        targetType,
        targetId,
        ipAddress,
        userAgent,
        status,
        detail ? JSON.stringify(detail) : null,
      ]
    );
  } catch (err) {
    // Audit log gagal tidak boleh crash aplikasi utama
    logger.error('Failed to write audit log:', err);
  }
};

/**
 * Helper: Ambil IP dari request Express
 */
const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    '0.0.0.0'
  );
};

/**
 * Ambil audit logs dengan filter dan pagination
 */
const getAuditLogs = async ({ page = 1, limit = 50, action = null, userId = null, status = null }) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (action) {
    conditions.push('action = ?');
    params.push(action);
  }
  if (userId) {
    conditions.push('user_id = ?');
    params.push(userId);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [logs, total] = await Promise.all([
    dbAll(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    dbGet(
      `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
      params
    ),
  ]);

  return {
    logs: logs.map((log) => ({
      ...log,
      detail: log.detail ? JSON.parse(log.detail) : null,
    })),
    pagination: {
      total: total.count,
      page,
      limit,
      totalPages: Math.ceil(total.count / limit),
    },
  };
};

module.exports = { createAuditLog, getClientIp, getAuditLogs };
