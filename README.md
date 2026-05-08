# AGRISAVE.IO – Secure Agricultural Financial Vault

> **Sistem Keamanan Data Transaksi Pertanian Enterprise-Grade**
> Implementasi kriptografi modern untuk pengamanan data keuangan petani.

---

## 🔐 Security Stack

| Layer | Teknologi |
|-------|-----------|
| Encryption | AES-256-GCM (AEAD) |
| Key Derivation | PBKDF2-SHA512 (310.000 iterasi) |
| Password Hashing | bcrypt (cost factor 12) |
| Authentication | JWT Access Token (15m) + Refresh Token (7d) |
| Session Storage | HttpOnly Cookie (Refresh Token) |
| Authorization | Role-Based Access Control (RBAC) |
| Input Validation | express-validator + XSS escape |
| Rate Limiting | 5 login/15m · 100 global/15m |
| HTTP Security | Helmet.js (CSP, HSTS, X-Frame-Options, dll) |
| Audit | Immutable audit log dengan IP tracking |

---

## 📁 Project Structure

```
Tubes_Kriptografi/
├── agrisave-backend/          # Node.js + Express API
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js    # SQLite connection (Singleton)
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── transactionController.js
│   │   │   ├── auditController.js
│   │   │   └── adminController.js
│   │   ├── database/
│   │   │   ├── init.js        # Schema initialization
│   │   │   └── seed.js        # Seed users
│   │   ├── middleware/
│   │   │   ├── auth.js        # JWT + RBAC middleware
│   │   │   ├── validators.js  # Input validation
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── transactions.js
│   │   │   ├── audit.js
│   │   │   └── admin.js
│   │   ├── services/
│   │   │   └── auditService.js
│   │   ├── utils/
│   │   │   ├── crypto.js      # AES-256-GCM + PBKDF2
│   │   │   └── logger.js      # Winston logger
│   │   └── server.js          # Express entry point
│   ├── data/                  # SQLite database (auto-created)
│   ├── logs/                  # Application logs (auto-created)
│   ├── .env
│   └── package.json
│
└── agrisave-frontend/         # React + Vite + Tailwind
    ├── src/
    │   ├── components/
    │   │   ├── DecryptModal.jsx
    │   │   ├── TransactionModal.jsx
    │   │   ├── DeleteModal.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── layouts/
    │   │   └── AppLayout.jsx   # Sidebar + Topbar
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── TransactionsPage.jsx
    │   │   ├── AuditPage.jsx
    │   │   ├── UsersPage.jsx
    │   │   └── CryptoFlowPage.jsx
    │   ├── services/
    │   │   └── api.js          # Axios + auto refresh
    │   ├── store/
    │   │   └── authStore.js    # Zustand auth state
    │   └── utils/
    │       └── ui.jsx          # Icons + helpers
    └── package.json
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- npm >= 9

### 1. Backend Setup

```bash
cd agrisave-backend

# Install dependencies
npm install

# Salin dan konfigurasi environment
cp .env.example .env
# Edit .env sesuai kebutuhan

# Inisialisasi database
npm run init-db

# Seed user awal
npm run seed

# Jalankan development server
npm run dev
```

Backend berjalan di: `http://localhost:5000`

### 2. Frontend Setup

```bash
cd agrisave-frontend

# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Frontend berjalan di: `http://localhost:5173`

---

## 🔑 Default Login Credentials

> ⚠️ **Ganti semua password ini sebelum deploy ke production!**

| Role | Username | Password |
|------|----------|----------|
| SUPER_ADMIN | `super_admin` | `Admin@2026!` |
| ADMIN | `admin_agri` | `Admin@2026!` |
| OPERATOR | `operator1` | `Operator@2026!` |
| VIEWER | `viewer1` | `Viewer@2026!` |

---

## 🔐 RBAC – Role-Based Access Control

| Permission | VIEWER | OPERATOR | ADMIN | SUPER_ADMIN |
|------------|:------:|:--------:|:-----:|:-----------:|
| Lihat statistik | ✅ | ✅ | ✅ | ✅ |
| Lihat list transaksi | ✅ | ✅ | ✅ | ✅ |
| Tambah transaksi | ❌ | ✅ | ✅ | ✅ |
| Decrypt transaksi | ❌ | ✅ (milik sendiri) | ✅ | ✅ |
| Edit transaksi | ❌ | ❌ | ✅ | ✅ |
| Hapus transaksi | ❌ | ❌ | ❌ | ✅ |
| Lihat audit log | ❌ | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ |

---

## 🔒 Alur Enkripsi (AES-256-GCM + PBKDF2)

```
Plaintext Data
     │
     ▼
Generate random Salt (32 bytes) + IV (12 bytes)
     │
     ▼
PBKDF2(masterKey, salt, 310000 iter, SHA-512) → 256-bit Key
     │
     ▼
AES-256-GCM Encrypt(key, iv, plaintext) → ciphertext + authTag(16B)
     │
     ▼
[salt(32B)][iv(12B)][authTag(16B)][ciphertext] → Base64
     │
     ▼
SHA-256(Base64) → checksum
     │
     ▼
Stored in Database (encrypted_content + encryption_checksum)
```

### Mengapa AES-256-GCM?
- **Authenticated Encryption (AEAD)**: Memberikan confidentiality + integrity sekaligus
- **Authentication Tag**: Jika data dimodifikasi satu bit pun, dekripsi GAGAL
- **AES-CBC** tidak memiliki built-in authentication → rentan tampering

---

## 🛡️ Threat Model

| Ancaman | Mitigasi |
|---------|----------|
| Brute Force Login | bcrypt cost-12 + rate limit 5x/15m + account lockout |
| Database Leak | Password: bcrypt hash · Data: AES-256-GCM (plaintext tidak pernah tersimpan) |
| Unauthorized Access | JWT 15m + RBAC backend enforcement per endpoint |
| Data Tampering | AES-GCM auth tag + SHA-256 checksum |
| Credential Theft | Access token hanya di memory · Refresh token HttpOnly cookie |
| XSS | express-validator .escape() + Content-Security-Policy (Helmet) |
| SQL Injection | Parameterized queries di semua database call |
| Session Fixation | Refresh token rotation + revocation saat logout |
| Insider Attack | Immutable audit log + master key tidak disimpan di DB |
| DoS | Global rate limiter + body size limit 10KB |

---

## 📡 API Reference

### Auth
```
POST   /api/auth/login         # Login (rate limited 5x/15m)
POST   /api/auth/register      # Register user baru
POST   /api/auth/refresh       # Refresh access token (via HttpOnly cookie)
POST   /api/auth/logout        # Logout + revoke refresh token
GET    /api/auth/me            # Info user aktif
```

### Transactions
```
GET    /api/transactions              # List (dengan pagination & filter)
POST   /api/transactions              # Tambah transaksi (enkripsi)
POST   /api/transactions/:id/decrypt  # Dekripsi transaksi
PUT    /api/transactions/:id          # Update (ADMIN+)
DELETE /api/transactions/:id          # Hapus - soft delete (SUPER_ADMIN)
```

### Audit
```
GET    /api/audit             # List audit log (ADMIN+)
GET    /api/audit/summary     # Statistik aktivitas (ADMIN+)
```

### Admin
```
GET    /api/admin/stats                    # Dashboard stats (ADMIN+)
GET    /api/admin/users                    # List users (SUPER_ADMIN)
PUT    /api/admin/users/:id/role           # Ubah role (SUPER_ADMIN)
PUT    /api/admin/users/:id/toggle-active  # Aktif/nonaktif (SUPER_ADMIN)
POST   /api/admin/users/:id/unlock        # Unlock akun (SUPER_ADMIN)
```

---

## 🗄️ Database Schema

```sql
-- Users: akun + role + lockout tracking
users (id, username, email, password_hash, full_name, role,
       is_active, login_attempts, locked_until, last_login)

-- Transactions: metadata plain + konten terenkripsi
transactions (id, created_by, meta_petani, meta_komoditas,
              meta_nominal, meta_jenis, meta_kelompok, meta_tenggat,
              encrypted_content, encryption_checksum, transaction_hash,
              is_deleted, deleted_by, deleted_at)

-- Audit Logs: immutable log semua aktivitas
audit_logs (id, user_id, username, role, action, target_type,
            target_id, ip_address, user_agent, status, detail)

-- Refresh Tokens: token management
refresh_tokens (id, user_id, token_hash, expires_at,
                ip_address, is_revoked)
```

---

## 🌐 Deployment Guide

### Backend → Render / Railway

```bash
# Environment variables yang WAJIB diset:
NODE_ENV=production
PORT=10000
JWT_SECRET=<random 64 char string>
JWT_REFRESH_SECRET=<random 64 char string>
SYSTEM_MASTER_KEY=<random 32 char string>
FRONTEND_URL=https://your-app.vercel.app
BCRYPT_SALT_ROUNDS=12
```

### Frontend → Vercel

1. Push `agrisave-frontend/` ke GitHub
2. Import di Vercel
3. Set environment variable:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```
4. Update `vite.config.js` proxy ke production URL

### Generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 📊 Perbandingan: Prototype Lama vs AGRISAVE.IO v2

| Aspek | Prototype Lama | AGRISAVE.IO v2 |
|-------|---------------|-----------------|
| Database | localStorage (browser) | SQLite/PostgreSQL (server) |
| Encryption | AES-CBC (no auth tag) | **AES-256-GCM (AEAD)** |
| Key Derivation | Password langsung → key | **PBKDF2-SHA512 (310K iter)** |
| Password | Plaintext | **bcrypt hash (cost 12)** |
| Auth | String compare | **JWT + HttpOnly refresh token** |
| RBAC | Frontend only (bypassable) | **Backend enforcement** |
| Audit Log | Tidak ada | **Immutable audit log** |
| Rate Limiting | Tidak ada | **5 login/15m + 100 global/15m** |
| Input Validation | Tidak ada | **express-validator + escape** |
| Integrity Check | Tidak ada | **Auth tag + SHA-256 checksum** |
| Error Handling | Alert biasa | **Centralized, tidak expose stack** |

---

## 👨‍💻 Developer

**Muhammad Iqbal Zafarullah** · G1A024007  
Universitas Bengkulu · Tugas Besar Kriptografi 2026

---

## 📄 License

MIT License — Free untuk keperluan akademik dan penelitian.
