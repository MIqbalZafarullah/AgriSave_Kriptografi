const express = require('express');
const router = express.Router();
const { getAudit, getAuditSummary } = require('../controllers/auditController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { paginationValidator } = require('../middleware/validators');

router.use(authenticateToken);
router.use(authorizeRole('SUPER_ADMIN', 'ADMIN'));

router.get('/', paginationValidator, getAudit);
router.get('/summary', getAuditSummary);

module.exports = router;
