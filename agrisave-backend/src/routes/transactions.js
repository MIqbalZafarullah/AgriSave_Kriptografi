const express = require('express');
const router = express.Router();
const { getTransactions, createTransaction, decryptTransaction, updateTransaction, deleteTransaction } = require('../controllers/transactionController');
const { authenticateToken, authorizeRole, authorizeMinRole } = require('../middleware/auth');
const { transactionValidator, decryptValidator, paginationValidator } = require('../middleware/validators');

// Semua route butuh autentikasi
router.use(authenticateToken);

// GET - semua role boleh lihat metadata
router.get('/', paginationValidator, getTransactions);

// POST - OPERATOR ke atas
router.post('/', authorizeMinRole('OPERATOR'), transactionValidator, createTransaction);

// POST decrypt - OPERATOR ke atas (bukan VIEWER)
router.post('/:id/decrypt', decryptValidator, decryptTransaction);

// PUT - ADMIN ke atas
router.put('/:id', authorizeRole('ADMIN', 'SUPER_ADMIN'), transactionValidator, updateTransaction);

// DELETE - SUPER_ADMIN saja
router.delete('/:id', authorizeRole('SUPER_ADMIN'), deleteTransaction);

module.exports = router;
