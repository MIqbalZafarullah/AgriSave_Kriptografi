const express = require('express');
const router = express.Router();
const { getUsers, updateUserRole, toggleUserActive, unlockUser, getDashboardStats } = require('../controllers/adminController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);

// Stats: ADMIN ke atas
router.get('/stats', authorizeRole('ADMIN', 'SUPER_ADMIN'), getDashboardStats);

// User management: SUPER_ADMIN saja
router.get('/users', authorizeRole('SUPER_ADMIN'), getUsers);
router.put('/users/:id/role', authorizeRole('SUPER_ADMIN'), updateUserRole);
router.put('/users/:id/toggle-active', authorizeRole('SUPER_ADMIN'), toggleUserActive);
router.post('/users/:id/unlock', authorizeRole('SUPER_ADMIN'), unlockUser);

module.exports = router;
