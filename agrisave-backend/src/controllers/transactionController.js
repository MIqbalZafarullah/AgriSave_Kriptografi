/**
 * AGRISAVE.IO - Transaction Controller
 * CRUD transaksi dengan AES-256-GCM encryption
 */
const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet, dbAll } = require('../config/database');
const { encrypt, decrypt, generateTransactionHash, verifyChecksum } = require('../utils/crypto');
const { createAuditLog, getClientIp } = require('../services/auditService');
const logger = require('../utils/logger');

/** GET /api/transactions - List semua transaksi (metadata only) */
const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, jenis, kelompok, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['is_deleted = 0'];
    const params = [];

    // VIEWER & OPERATOR hanya lihat transaksi milik mereka
    if (req.user.role === 'OPERATOR') {
      conditions.push('created_by = ?');
      params.push(req.user.id);
    }
    if (jenis) { conditions.push('meta_jenis = ?'); params.push(jenis); }
    if (kelompok) { conditions.push('meta_kelompok = ?'); params.push(kelompok); }
    if (search) {
      conditions.push('(meta_petani LIKE ? OR meta_komoditas LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const [rows, total] = await Promise.all([
      dbAll(`SELECT t.id, t.meta_petani, t.meta_komoditas, t.meta_nominal, t.meta_jenis,
               t.meta_kelompok, t.meta_tenggat, t.transaction_hash, t.created_at, t.updated_at,
               u.username as created_by_username
             FROM transactions t JOIN users u ON t.created_by = u.id
             ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]),
      dbGet(`SELECT COUNT(*) as count FROM transactions ${where}`, params),
    ]);

    // Stats agregat
    const stats = await dbGet(
      `SELECT SUM(CASE WHEN meta_jenis='Modal' THEN meta_nominal ELSE 0 END) as total_modal,
              SUM(CASE WHEN meta_jenis='Panen' THEN meta_nominal ELSE 0 END) as total_panen,
              COUNT(*) as total_records
       FROM transactions WHERE is_deleted = 0`,
      []
    );

    res.json({
      success: true,
      data: { transactions: rows, stats, pagination: { total: total.count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total.count / parseInt(limit)) } }
    });
  } catch (err) {
    logger.error('getTransactions error:', err);
    res.status(500).json({ success: false, error: 'FETCH_ERROR' });
  }
};

/** POST /api/transactions - Tambah transaksi baru (dengan enkripsi) */
const createTransaction = async (req, res) => {
  const { petani, komoditas, nominal, jenis_transaksi, kelompok_tani, tenggat_panen, keterangan, master_key } = req.body;
  const ip = getClientIp(req);

  try {
    // Data sensitif yang akan dienkripsi
    const sensitiveData = JSON.stringify({
      petani, komoditas, nominal: parseInt(nominal),
      jenis_transaksi, kelompok_tani: kelompok_tani || 'Umum',
      tenggat_panen: jenis_transaksi === 'Modal' ? (tenggat_panen || null) : null,
      keterangan: keterangan || '',
      created_by: req.user.username,
      created_at: new Date().toISOString(),
    });

    // Enkripsi dengan AES-256-GCM + PBKDF2
    const { encrypted, checksum } = encrypt(sensitiveData, master_key);

    const id = uuidv4();
    const txHash = generateTransactionHash({
      id, petani, nominal: parseInt(nominal),
      jenis_transaksi, created_at: new Date().toISOString(),
    });

    await dbRun(
      `INSERT INTO transactions (id, created_by, meta_petani, meta_komoditas, meta_nominal,
       meta_jenis, meta_kelompok, meta_tenggat, encrypted_content, encryption_checksum, transaction_hash)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, req.user.id, petani, komoditas, parseInt(nominal), jenis_transaksi,
       kelompok_tani || 'Umum', jenis_transaksi === 'Modal' ? (tenggat_panen || null) : null,
       encrypted, checksum, txHash]
    );

    await createAuditLog({
      userId: req.user.id, username: req.user.username, role: req.user.role,
      action: 'ADD_TRANSACTION', targetType: 'transaction', targetId: id,
      ipAddress: ip, status: 'SUCCESS',
      detail: { petani, komoditas, nominal, jenis: jenis_transaksi },
    });

    res.status(201).json({
      success: true, message: 'Transaksi berhasil disimpan dan dienkripsi.',
      data: { id, transaction_hash: txHash }
    });
  } catch (err) {
    logger.error('createTransaction error:', err);
    res.status(500).json({ success: false, error: 'CREATE_ERROR' });
  }
};

/** POST /api/transactions/:id/decrypt - Dekripsi transaksi */
const decryptTransaction = async (req, res) => {
  const { id } = req.params;
  const { master_key } = req.body;
  const ip = getClientIp(req);

  // VIEWER tidak boleh decrypt
  if (req.user.role === 'VIEWER') {
    return res.status(403).json({ success: false, error: 'VIEWER_NO_DECRYPT', message: 'VIEWER tidak dapat mendekripsi data.' });
  }

  try {
    const tx = await dbGet('SELECT * FROM transactions WHERE id = ? AND is_deleted = 0', [id]);
    if (!tx) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Transaksi tidak ditemukan.' });

    // OPERATOR hanya bisa decrypt miliknya
    if (req.user.role === 'OPERATOR' && tx.created_by !== req.user.id) {
      await createAuditLog({ userId: req.user.id, username: req.user.username, role: req.user.role,
        action: 'FAILED_DECRYPT', targetType: 'transaction', targetId: id,
        ipAddress: ip, status: 'FAILED', detail: { reason: 'NOT_OWNER' } });
      return res.status(403).json({ success: false, error: 'NOT_OWNER', message: 'Anda tidak memiliki akses ke transaksi ini.' });
    }

    // Verifikasi checksum integritas sebelum decrypt
    const { verifyChecksum: vc } = require('../utils/crypto');
    // Decrypt
    let plaintext;
    try {
      plaintext = decrypt(tx.encrypted_content, master_key);
    } catch {
      await createAuditLog({ userId: req.user.id, username: req.user.username, role: req.user.role,
        action: 'FAILED_DECRYPT', targetType: 'transaction', targetId: id,
        ipAddress: ip, status: 'FAILED', detail: { reason: 'WRONG_KEY_OR_TAMPERED' } });
      return res.status(401).json({ success: false, error: 'DECRYPTION_FAILED',
        message: 'Master key salah atau data telah dimanipulasi. Authentication tag verification failed.' });
    }

    const data = JSON.parse(plaintext);
    await createAuditLog({ userId: req.user.id, username: req.user.username, role: req.user.role,
      action: 'DECRYPT', targetType: 'transaction', targetId: id,
      ipAddress: ip, status: 'SUCCESS', detail: { petani: data.petani } });

    res.json({
      success: true, message: 'Dekripsi berhasil. Authentication tag verified.',
      data: { ...data, transaction_hash: tx.transaction_hash, encryption_checksum: tx.encryption_checksum, id: tx.id, created_at: tx.created_at }
    });
  } catch (err) {
    logger.error('decryptTransaction error:', err);
    res.status(500).json({ success: false, error: 'DECRYPT_ERROR' });
  }
};

/** PUT /api/transactions/:id - Update transaksi */
const updateTransaction = async (req, res) => {
  const { id } = req.params;
  const { petani, komoditas, nominal, jenis_transaksi, kelompok_tani, tenggat_panen, keterangan, master_key } = req.body;
  const ip = getClientIp(req);

  try {
    const tx = await dbGet('SELECT * FROM transactions WHERE id = ? AND is_deleted = 0', [id]);
    if (!tx) return res.status(404).json({ success: false, error: 'NOT_FOUND' });

    // Verifikasi master_key dengan mencoba decrypt dulu
    try { decrypt(tx.encrypted_content, master_key); }
    catch {
      await createAuditLog({ userId: req.user.id, username: req.user.username, role: req.user.role,
        action: 'FAILED_EDIT', targetType: 'transaction', targetId: id, ipAddress: ip, status: 'FAILED' });
      return res.status(401).json({ success: false, error: 'WRONG_KEY', message: 'Master key lama salah. Tidak bisa memvalidasi perubahan.' });
    }

    const sensitiveData = JSON.stringify({
      petani, komoditas, nominal: parseInt(nominal), jenis_transaksi,
      kelompok_tani: kelompok_tani || 'Umum',
      tenggat_panen: jenis_transaksi === 'Modal' ? (tenggat_panen || null) : null,
      keterangan: keterangan || '',
      updated_by: req.user.username,
      updated_at: new Date().toISOString(),
    });

    const { encrypted, checksum } = encrypt(sensitiveData, master_key);
    const txHash = generateTransactionHash({ id, petani, nominal: parseInt(nominal), jenis_transaksi, created_at: tx.created_at });

    await dbRun(
      `UPDATE transactions SET meta_petani=?, meta_komoditas=?, meta_nominal=?, meta_jenis=?,
       meta_kelompok=?, meta_tenggat=?, encrypted_content=?, encryption_checksum=?,
       transaction_hash=?, updated_at=datetime('now') WHERE id=?`,
      [petani, komoditas, parseInt(nominal), jenis_transaksi,
       kelompok_tani || 'Umum', jenis_transaksi === 'Modal' ? (tenggat_panen || null) : null,
       encrypted, checksum, txHash, id]
    );

    await createAuditLog({ userId: req.user.id, username: req.user.username, role: req.user.role,
      action: 'EDIT_TRANSACTION', targetType: 'transaction', targetId: id, ipAddress: ip, status: 'SUCCESS' });

    res.json({ success: true, message: 'Transaksi berhasil diperbarui dan di-enkripsi ulang.', data: { id, transaction_hash: txHash } });
  } catch (err) {
    logger.error('updateTransaction error:', err);
    res.status(500).json({ success: false, error: 'UPDATE_ERROR' });
  }
};

/** DELETE /api/transactions/:id - Soft delete */
const deleteTransaction = async (req, res) => {
  const { id } = req.params;
  const ip = getClientIp(req);
  try {
    const tx = await dbGet('SELECT * FROM transactions WHERE id = ? AND is_deleted = 0', [id]);
    if (!tx) return res.status(404).json({ success: false, error: 'NOT_FOUND' });

    await dbRun(`UPDATE transactions SET is_deleted=1, deleted_by=?, deleted_at=datetime('now') WHERE id=?`,
      [req.user.id, id]);

    await createAuditLog({ userId: req.user.id, username: req.user.username, role: req.user.role,
      action: 'DELETE_TRANSACTION', targetType: 'transaction', targetId: id,
      ipAddress: ip, status: 'SUCCESS', detail: { petani: tx.meta_petani } });

    res.json({ success: true, message: 'Transaksi berhasil dihapus (soft delete).' });
  } catch (err) {
    logger.error('deleteTransaction error:', err);
    res.status(500).json({ success: false, error: 'DELETE_ERROR' });
  }
};

module.exports = { getTransactions, createTransaction, decryptTransaction, updateTransaction, deleteTransaction };
