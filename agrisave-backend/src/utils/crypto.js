/**
 * AGRISAVE.IO - Crypto Utility
 * 
 * Implementasi kriptografi modern:
 * - AES-256-GCM (Authenticated Encryption)
 * - PBKDF2 untuk Key Derivation
 * - Random IV & Salt setiap enkripsi
 * - SHA-256 untuk hashing/checksum
 * 
 * MENGAPA AES-256-GCM vs AES-CBC:
 * - GCM = Galois/Counter Mode
 * - Memberikan AEAD: Authenticated Encryption with Associated Data
 * - Authentication Tag mencegah data tampering
 * - Jika ciphertext dimodifikasi → dekripsi GAGAL (integrity protection)
 * - CBC tidak memiliki built-in authentication
 */
const crypto = require('crypto');
const logger = require('./logger');

const ALGORITHM = 'aes-256-gcm';
const PBKDF2_ITERATIONS = parseInt(process.env.PBKDF2_ITERATIONS) || 310000;
const PBKDF2_KEYLEN = parseInt(process.env.PBKDF2_KEYLEN) || 32; // 256 bits
const PBKDF2_DIGEST = 'sha512';
const IV_LENGTH = 12;      // 96 bits (recommended for GCM)
const SALT_LENGTH = 32;    // 256 bits
const TAG_LENGTH = 16;     // 128 bits auth tag (GCM default)

/**
 * PBKDF2 Key Derivation
 * 
 * Flow: password + salt → PBKDF2(SHA-512, 310000 iterasi) → 256-bit key
 * 
 * Mengapa PBKDF2?
 * - Membuat brute force sangat lambat (310K iterasi)
 * - Password berbeda TIDAK menghasilkan key sama meski password mirip
 * - Salt memastikan rainbow table attack tidak efektif
 * 
 * @param {string} password - User password / master key
 * @param {Buffer} salt - Random salt (32 bytes)
 * @returns {Buffer} - Derived key 256-bit
 */
const deriveKey = (password, salt) => {
  return crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEYLEN,
    PBKDF2_DIGEST
  );
};

/**
 * AES-256-GCM Encryption
 * 
 * Flow enkripsi:
 * plaintext → PBKDF2(password+salt) → key → AES-256-GCM(key+iv) → ciphertext+authTag
 * 
 * Output format (base64):
 * [salt(32B)][iv(12B)][authTag(16B)][ciphertext]
 * 
 * @param {string} plaintext - Data yang akan dienkripsi
 * @param {string} password - Master key / user password
 * @returns {{ encrypted: string, checksum: string }} - Ciphertext & SHA-256 checksum
 */
const encrypt = (plaintext, password) => {
  try {
    // Generate random salt dan IV setiap kali enkripsi
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Key derivation: password + salt → 256-bit key
    const key = deriveKey(password, salt);

    // AES-256-GCM encryption
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Authentication tag (mencegah tampering)
    const authTag = cipher.getAuthTag();

    // Gabungkan: salt + iv + authTag + ciphertext
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);
    const encryptedB64 = combined.toString('base64');

    // SHA-256 checksum dari ciphertext (untuk verifikasi integritas PDF)
    const checksum = sha256Hash(encryptedB64);

    return { encrypted: encryptedB64, checksum };
  } catch (err) {
    logger.error('Encryption failed:', err);
    throw new Error('ENCRYPTION_FAILED');
  }
};

/**
 * AES-256-GCM Decryption
 * 
 * Flow dekripsi:
 * ciphertext → parse(salt+iv+authTag+data) → PBKDF2(password+salt) → key
 * → AES-256-GCM-decrypt(key+iv+authTag) → plaintext
 * 
 * Jika password salah atau data dimodifikasi → AuthTag verification GAGAL → throw error
 * 
 * @param {string} encryptedB64 - Ciphertext dalam base64
 * @param {string} password - Master key untuk dekripsi
 * @returns {string} - Plaintext hasil dekripsi
 */
const decrypt = (encryptedB64, password) => {
  try {
    const combined = Buffer.from(encryptedB64, 'base64');

    // Parse komponen dari buffer gabungan
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Key derivation dengan salt yang sama
    const key = deriveKey(password, salt);

    // AES-256-GCM decryption
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: TAG_LENGTH,
    });

    // Set auth tag → jika berbeda, decipher.final() akan throw
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(), // ← Throws jika password salah atau data tampered
    ]);

    return decrypted.toString('utf8');
  } catch (err) {
    // Jangan expose detail error ke client (security best practice)
    logger.warn('Decryption failed - invalid key or tampered data');
    throw new Error('DECRYPTION_FAILED');
  }
};

/**
 * SHA-256 Hash
 * Digunakan untuk: checksum, transaction hash, PDF verification
 */
const sha256Hash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Generate secure random token (untuk refresh token, dll)
 */
const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Generate Transaction Hash
 * Membuat fingerprint unik dari data transaksi untuk PDF verification
 * 
 * @param {object} transactionData - Data transaksi
 * @returns {string} - SHA-256 hash hex
 */
const generateTransactionHash = (transactionData) => {
  const normalized = JSON.stringify({
    id: transactionData.id,
    petani: transactionData.petani,
    nominal: transactionData.nominal,
    jenis: transactionData.jenis_transaksi,
    timestamp: transactionData.created_at,
  });
  return sha256Hash(normalized);
};

/**
 * Verifikasi checksum - untuk validasi integritas
 */
const verifyChecksum = (data, expectedChecksum) => {
  const computed = sha256Hash(data);
  // Gunakan timingSafeEqual untuk mencegah timing attack
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(expectedChecksum, 'hex')
    );
  } catch {
    return false;
  }
};

module.exports = {
  encrypt,
  decrypt,
  sha256Hash,
  generateSecureToken,
  generateTransactionHash,
  verifyChecksum,
};
