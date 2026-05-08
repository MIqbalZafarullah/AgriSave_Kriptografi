/**
 * AGRISAVE.IO - Database Schema Initialization
 * 
 * Menjalankan: node src/database/init.js
 * 
 * Tabel:
 * - users: Akun pengguna + role
 * - transactions: Data transaksi terenkripsi (metadata plain, konten AES-256-GCM)
 * - audit_logs: Semua aktivitas sistem
 * - refresh_tokens: JWT refresh token management
 */
require('dotenv').config();
const { dbRun, getDb } = require('../config/database');
const logger = require('../utils/logger');

const initializeSchema = async () => {
  logger.info('🚀 Initializing AGRISAVE.IO database schema...');

  try {
    // ─────────────────────────────────────────────
    // TABEL: users
    // ─────────────────────────────────────────────
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id          TEXT PRIMARY KEY,
        username    TEXT UNIQUE NOT NULL,
        email       TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,       -- bcrypt hash, BUKAN plaintext
        full_name   TEXT NOT NULL,
        role        TEXT NOT NULL DEFAULT 'OPERATOR'
                    CHECK(role IN ('SUPER_ADMIN','ADMIN','OPERATOR','VIEWER')),
        is_active   INTEGER NOT NULL DEFAULT 1,
        login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until   TEXT,
        last_login  TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    logger.info('✅ Table: users');

    // ─────────────────────────────────────────────
    // TABEL: transactions
    // metadata disimpan plaintext (untuk filtering/search)
    // konten sensitif dienkripsi AES-256-GCM
    // ─────────────────────────────────────────────
    await dbRun(`
      CREATE TABLE IF NOT EXISTS transactions (
        id              TEXT PRIMARY KEY,
        created_by      TEXT NOT NULL,        -- user_id
        
        -- METADATA (plaintext, untuk dashboard & filtering)
        meta_petani     TEXT NOT NULL,
        meta_komoditas  TEXT NOT NULL,
        meta_nominal    INTEGER NOT NULL,
        meta_jenis      TEXT NOT NULL CHECK(meta_jenis IN ('Modal','Panen')),
        meta_kelompok   TEXT NOT NULL DEFAULT 'Umum',
        meta_tenggat    TEXT,                 -- tanggal jatuh tempo
        
        -- KONTEN TERENKRIPSI (AES-256-GCM)
        encrypted_content TEXT NOT NULL,      -- ciphertext base64
        encryption_checksum TEXT NOT NULL,    -- SHA-256 of ciphertext (integrity check)
        transaction_hash  TEXT NOT NULL,      -- SHA-256 fingerprint untuk PDF
        
        -- STATUS
        is_deleted      INTEGER NOT NULL DEFAULT 0,
        deleted_by      TEXT,
        deleted_at      TEXT,
        
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
        
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (deleted_by) REFERENCES users(id)
      )
    `);
    logger.info('✅ Table: transactions');

    // ─────────────────────────────────────────────
    // TABEL: audit_logs
    // Immutable log — tidak boleh ada UPDATE/DELETE
    // ─────────────────────────────────────────────
    await dbRun(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id          TEXT PRIMARY KEY,
        user_id     TEXT,                 -- NULL jika unauthenticated
        username    TEXT,                 -- disimpan langsung (denormalized, log harus self-contained)
        role        TEXT,
        action      TEXT NOT NULL,        -- LOGIN, LOGOUT, DECRYPT, ADD_TX, EDIT_TX, DELETE_TX, FAILED_LOGIN, dll
        target_type TEXT,                 -- 'transaction', 'user', 'system'
        target_id   TEXT,                 -- ID record yang diakses
        ip_address  TEXT NOT NULL,
        user_agent  TEXT,
        status      TEXT NOT NULL DEFAULT 'SUCCESS' CHECK(status IN ('SUCCESS','FAILED','WARNING')),
        detail      TEXT,                 -- JSON detail tambahan
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    logger.info('✅ Table: audit_logs');

    // ─────────────────────────────────────────────
    // TABEL: refresh_tokens
    // ─────────────────────────────────────────────
    await dbRun(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        token_hash  TEXT NOT NULL UNIQUE,  -- SHA-256 hash of token (tidak simpan plaintext)
        expires_at  TEXT NOT NULL,
        ip_address  TEXT,
        user_agent  TEXT,
        is_revoked  INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    logger.info('✅ Table: refresh_tokens');

    // ─────────────────────────────────────────────
    // INDEXES untuk performa query
    // ─────────────────────────────────────────────
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_transactions_jenis ON transactions(meta_jenis)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_transactions_kelompok ON transactions(meta_kelompok)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_transactions_deleted ON transactions(is_deleted)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id)`);
    logger.info('✅ Indexes created');

    logger.info('🎉 Database schema initialized successfully!');
    process.exit(0);
  } catch (err) {
    logger.error('❌ Schema initialization failed:', err);
    process.exit(1);
  }
};

initializeSchema();
