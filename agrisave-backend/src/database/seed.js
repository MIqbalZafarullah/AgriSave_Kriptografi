/**
 * AGRISAVE.IO - Database Seeder
 * 
 * Membuat user awal:
 * - super_admin / Admin@2026! (SUPER_ADMIN)
 * - admin_agri / Admin@2026! (ADMIN)
 * - operator1 / Operator@2026! (OPERATOR)
 * - viewer1 / Viewer@2026! (VIEWER)
 * 
 * Jalankan: node src/database/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet } = require('../config/database');
const { sha256Hash } = require('../utils/crypto');
const logger = require('../utils/logger');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

const seedUsers = [
  {
    username: 'super_admin',
    email: 'superadmin@agrisave.io',
    password: 'Admin@2026!',
    full_name: 'Muhammad Iqbal Zafarullah',
    role: 'SUPER_ADMIN',
  },
  {
    username: 'admin_agri',
    email: 'admin@agrisave.io',
    password: 'Admin@2026!',
    full_name: 'Admin Agrisave',
    role: 'ADMIN',
  },
  {
    username: 'operator1',
    email: 'operator1@agrisave.io',
    password: 'Operator@2026!',
    full_name: 'Operator Pertanian 1',
    role: 'OPERATOR',
  },
  {
    username: 'viewer1',
    email: 'viewer1@agrisave.io',
    password: 'Viewer@2026!',
    full_name: 'Viewer Dashboard',
    role: 'VIEWER',
  },
];

const runSeed = async () => {
  logger.info('🌱 Seeding database...');

  for (const user of seedUsers) {
    const existing = await dbGet('SELECT id FROM users WHERE username = ?', [user.username]);
    if (existing) {
      logger.info(`⏩ User sudah ada: ${user.username}`);
      continue;
    }

    const password_hash = await bcrypt.hash(user.password, SALT_ROUNDS);
    const id = uuidv4();

    await dbRun(
      `INSERT INTO users (id, username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, user.username, user.email, password_hash, user.full_name, user.role]
    );

    logger.info(`✅ Created user: ${user.username} (${user.role})`);
  }

  logger.info('');
  logger.info('🔐 LOGIN CREDENTIALS (DEVELOPMENT ONLY):');
  logger.info('─────────────────────────────────────────');
  seedUsers.forEach(u => {
    logger.info(`  ${u.role.padEnd(12)} | ${u.username.padEnd(15)} | ${u.password}`);
  });
  logger.info('─────────────────────────────────────────');
  logger.info('⚠️  Ganti password ini sebelum deploy ke production!');
  
  process.exit(0);
};

runSeed().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
