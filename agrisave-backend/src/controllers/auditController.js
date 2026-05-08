/**
 * AGRISAVE.IO - Audit Controller
 */
const { getAuditLogs } = require('../services/auditService');
const { dbAll, dbGet } = require('../config/database');
const logger = require('../utils/logger');

/** GET /api/audit - Semua audit logs (SUPER_ADMIN & ADMIN only) */
const getAudit = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId, status } = req.query;
    const result = await getAuditLogs({
      page: parseInt(page), limit: parseInt(limit),
      action, userId, status,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('getAudit error:', err);
    res.status(500).json({ success: false, error: 'AUDIT_FETCH_ERROR' });
  }
};

/** GET /api/audit/summary - Statistik aktivitas */
const getAuditSummary = async (req, res) => {
  try {
    const [actionStats, recentFailures, activeUsers] = await Promise.all([
      dbAll(`SELECT action, status, COUNT(*) as count
             FROM audit_logs GROUP BY action, status ORDER BY count DESC LIMIT 20`, []),
      dbAll(`SELECT * FROM audit_logs WHERE status = 'FAILED'
             ORDER BY created_at DESC LIMIT 10`, []),
      dbAll(`SELECT username, role, COUNT(*) as activity_count, MAX(created_at) as last_active
             FROM audit_logs WHERE created_at >= datetime('now', '-24 hours')
             AND user_id IS NOT NULL GROUP BY user_id ORDER BY activity_count DESC LIMIT 10`, []),
    ]);
    res.json({ success: true, data: { actionStats, recentFailures, activeUsers } });
  } catch (err) {
    logger.error('getAuditSummary error:', err);
    res.status(500).json({ success: false, error: 'AUDIT_SUMMARY_ERROR' });
  }
};

module.exports = { getAudit, getAuditSummary };
