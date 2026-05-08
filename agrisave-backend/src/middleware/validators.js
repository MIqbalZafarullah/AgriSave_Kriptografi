/**
 * AGRISAVE.IO - Input Validation Middleware
 * Menggunakan express-validator untuk validasi & sanitasi input.
 * 
 * Mencegah:
 * - SQL Injection (parameterized queries di db layer)
 * - XSS (sanitasi + encoding)
 * - Invalid data types
 */
const { body, param, query, validationResult } = require('express-validator');

/**
 * Helper: Jalankan validasi, return error jika ada
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Input tidak valid.',
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
        value: e.value,
      })),
    });
  }
  next();
};

// ─────────────────────────────────────────────
// Auth Validators
// ─────────────────────────────────────────────

const loginValidator = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username wajib diisi.')
    .isLength({ max: 50 }).withMessage('Username maksimal 50 karakter.')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username hanya boleh huruf, angka, dan underscore.'),

  body('password')
    .notEmpty().withMessage('Password wajib diisi.')
    .isLength({ min: 8, max: 128 }).withMessage('Password minimal 8 karakter.'),

  validate,
];

const registerValidator = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username wajib diisi.')
    .isLength({ min: 3, max: 50 }).withMessage('Username 3-50 karakter.')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username hanya boleh huruf, angka, dan underscore.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email wajib diisi.')
    .isEmail().withMessage('Format email tidak valid.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password wajib diisi.')
    .isLength({ min: 8, max: 128 }).withMessage('Password minimal 8 karakter.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password harus mengandung huruf besar, huruf kecil, angka, dan simbol (@$!%*?&).'),

  body('full_name')
    .trim()
    .notEmpty().withMessage('Nama lengkap wajib diisi.')
    .isLength({ min: 2, max: 100 }).withMessage('Nama lengkap 2-100 karakter.')
    .escape(), // XSS protection

  body('role')
    .optional()
    .isIn(['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER'])
    .withMessage('Role tidak valid.'),

  validate,
];

// ─────────────────────────────────────────────
// Transaction Validators
// ─────────────────────────────────────────────

const transactionValidator = [
  body('petani')
    .trim()
    .notEmpty().withMessage('Nama petani wajib diisi.')
    .isLength({ min: 2, max: 100 }).withMessage('Nama petani 2-100 karakter.')
    .escape(),

  body('komoditas')
    .trim()
    .notEmpty().withMessage('Komoditas wajib diisi.')
    .isLength({ min: 1, max: 100 }).withMessage('Komoditas maksimal 100 karakter.')
    .escape(),

  body('nominal')
    .notEmpty().withMessage('Nominal wajib diisi.')
    .isInt({ min: 1, max: 999999999999 }).withMessage('Nominal harus angka positif.'),

  body('jenis_transaksi')
    .notEmpty().withMessage('Jenis transaksi wajib diisi.')
    .isIn(['Modal', 'Panen']).withMessage('Jenis transaksi harus Modal atau Panen.'),

  body('kelompok_tani')
    .trim()
    .optional()
    .isLength({ max: 100 }).withMessage('Kelompok tani maksimal 100 karakter.')
    .escape(),

  body('tenggat_panen')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('Format tanggal tidak valid (gunakan YYYY-MM-DD).'),

  body('keterangan')
    .optional()
    .isLength({ max: 500 }).withMessage('Keterangan maksimal 500 karakter.')
    .escape(),

  body('master_key')
    .notEmpty().withMessage('Master key wajib diisi untuk enkripsi.')
    .isLength({ min: 8, max: 256 }).withMessage('Master key minimal 8 karakter.'),

  validate,
];

const decryptValidator = [
  param('id').notEmpty().isUUID().withMessage('ID transaksi tidak valid.'),
  body('master_key')
    .notEmpty().withMessage('Master key wajib diisi.')
    .isLength({ min: 8, max: 256 }).withMessage('Master key minimal 8 karakter.'),
  validate,
];

// ─────────────────────────────────────────────
// Pagination & Filter Validators
// ─────────────────────────────────────────────

const paginationValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page harus bilangan bulat positif.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit 1-100.'),
  validate,
];

module.exports = {
  loginValidator,
  registerValidator,
  transactionValidator,
  decryptValidator,
  paginationValidator,
  validate,
};
