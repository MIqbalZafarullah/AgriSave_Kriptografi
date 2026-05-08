/**
 * AGRISAVE.IO - Database Configuration
 * Menggunakan SQLite untuk kemudahan setup lokal.
 * Untuk produksi: ganti dengan PostgreSQL (node-postgres / pg).
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const DB_PATH = process.env.DB_PATH || './data/agrisave.db';
const dbDir = path.dirname(path.resolve(DB_PATH));

// Pastikan direktori database ada
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

/**
 * Mendapatkan instance database (Singleton Pattern)
 */
const getDb = () => {
  if (!db) {
    db = new sqlite3.Database(path.resolve(DB_PATH), (err) => {
      if (err) {
        logger.error('Database connection failed:', err);
        process.exit(1);
      }
      logger.info(`Database connected: ${DB_PATH}`);
    });

    // Aktifkan WAL mode untuk performa lebih baik
    db.run('PRAGMA journal_mode=WAL');
    db.run('PRAGMA foreign_keys=ON');
    db.run('PRAGMA busy_timeout=5000');
  }
  return db;
};

/**
 * Helper: Promise wrapper untuk db.run
 */
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

/**
 * Helper: Promise wrapper untuk db.get (single row)
 */
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

/**
 * Helper: Promise wrapper untuk db.all (multiple rows)
 */
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = { getDb, dbRun, dbGet, dbAll };
