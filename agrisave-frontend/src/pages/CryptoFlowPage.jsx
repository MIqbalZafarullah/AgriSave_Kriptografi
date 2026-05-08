/**
 * AGRISAVE.IO - Crypto Flow Visualization Page
 * Menjelaskan alur enkripsi AES-256-GCM + PBKDF2 secara visual.
 */
import { Icons } from '../utils/ui';

const FlowStep = ({ step, title, desc, code, color = 'lime' }) => (
  <div className={`card top-highlight p-6 relative ${color === 'lime' ? 'card-glow' : ''}`}>
    <div className="flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${color === 'lime' ? 'bg-lime-400 text-black' : color === 'blue' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
        {step}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-white text-sm">{title}</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
        {code && <code className="block mt-3 font-mono text-[10px] text-lime-400/70 bg-black/40 rounded-xl p-3 break-all leading-relaxed">{code}</code>}
      </div>
    </div>
  </div>
);

const Arrow = () => (
  <div className="flex justify-center py-1">
    <Icons.ArrowRight className="text-lime-400/40 rotate-90" width={20} height={20} />
  </div>
);

const ThreatCard = ({ threat, mitigation, icon: Icon, level }) => (
  <div className={`card top-highlight p-5 border-l-4 ${level === 'high' ? 'border-l-red-500' : level === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'}`}>
    <div className="flex items-start gap-3">
      <Icon className={`flex-shrink-0 mt-0.5 ${level === 'high' ? 'text-red-400' : level === 'medium' ? 'text-yellow-400' : 'text-blue-400'}`} width={18} height={18} />
      <div>
        <p className="font-black text-white text-sm">{threat}</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{mitigation}</p>
      </div>
    </div>
  </div>
);

export default function CryptoFlowPage() {
  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Crypto Flow & Security Architecture</h1>
        <p className="text-sm text-gray-500 mt-1">Visualisasi alur kriptografi dan threat model sistem AGRISAVE.IO</p>
      </div>

      {/* Encrypt Flow */}
      <section>
        <h2 className="text-[11px] font-black text-lime-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Icons.Lock width={14} height={14} /> Alur Enkripsi (Plaintext → Ciphertext)
        </h2>
        <div className="space-y-1">
          <FlowStep step="1" title="Plaintext (Data Sensitif)" color="blue"
            desc="Data transaksi mentah: nama petani, komoditas, nominal, keterangan."
            code={`{ "petani": "Budi Santoso", "nominal": 5000000, "jenis": "Modal" }`} />
          <Arrow />
          <FlowStep step="2" title="Generate Random Salt (32 bytes) + IV (12 bytes)" color="blue"
            desc="Salt dan IV digenerate secara kriptografis random setiap kali enkripsi. Memastikan ciphertext selalu berbeda meskipun plaintext sama."
            code={`salt = crypto.randomBytes(32)  // 256-bit\niv   = crypto.randomBytes(12)  // 96-bit (GCM optimal)`} />
          <Arrow />
          <FlowStep step="3" title="PBKDF2-SHA512 Key Derivation (310.000 iterasi)" color="lime"
            desc="Master key + salt diproses 310.000 kali untuk menghasilkan 256-bit encryption key. Brute force sangat lambat: ~3 detik per percobaan di modern CPU."
            code={`key = pbkdf2Sync(masterKey, salt, 310000, 32, 'sha512')\n// Output: 256-bit derived key`} />
          <Arrow />
          <FlowStep step="4" title="AES-256-GCM Encryption (AEAD)" color="lime"
            desc="Enkripsi + otentikasi sekaligus. Menghasilkan ciphertext + authentication tag 128-bit. Tag ini membuktikan integritas data — jika data dimodifikasi, dekripsi akan GAGAL."
            code={`cipher = createCipheriv('aes-256-gcm', key, iv)\nciphertext = cipher.update(plaintext) + cipher.final()\nauthTag   = cipher.getAuthTag()  // 128-bit integrity proof`} />
          <Arrow />
          <FlowStep step="5" title="Storage Format (Base64)" color="blue"
            desc="Semua komponen digabung menjadi satu string Base64 yang disimpan di database."
            code={`[salt(32B)] + [iv(12B)] + [authTag(16B)] + [ciphertext(nB)]\n→ Base64 encode → stored in DB`} />
          <Arrow />
          <FlowStep step="6" title="SHA-256 Checksum" color="blue"
            desc="SHA-256 dari ciphertext disimpan sebagai encryption_checksum. Digunakan untuk verifikasi integritas dan PDF receipt."
            code={`checksum = sha256(encryptedBase64)\n→ stored alongside ciphertext`} />
        </div>
      </section>

      {/* Decrypt Flow */}
      <section>
        <h2 className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Icons.Unlock width={14} height={14} /> Alur Dekripsi (Ciphertext → Plaintext)
        </h2>
        <div className="space-y-1">
          <FlowStep step="1" title="Parse Komponen dari Base64" color="blue"
            desc="Ciphertext di-decode dan diparsing menjadi komponen: salt, iv, authTag, ciphertext."
            code={`combined = Buffer.from(encryptedB64, 'base64')\nsalt     = combined[0..31]\niv       = combined[32..43]\nauthTag  = combined[44..59]\ndata     = combined[60..]`} />
          <Arrow />
          <FlowStep step="2" title="PBKDF2 Key Derivation (sama salt)" color="lime"
            desc="Master key + salt yang sama menghasilkan key yang identik. Jika master key salah → key berbeda → dekripsi gagal."
            code={`key = pbkdf2Sync(masterKey, salt, 310000, 32, 'sha512')`} />
          <Arrow />
          <FlowStep step="3" title="AES-256-GCM Authentication Tag Verification" color="lime"
            desc="Sebelum dekripsi, GCM mode memverifikasi authTag. Jika tag tidak cocok (wrong key atau data tampered) → THROW ERROR. Data tidak akan pernah di-return jika integrity gagal."
            code={`decipher.setAuthTag(authTag)\n// If wrong key or tampered → throws 'Unsupported state or unable to authenticate data'`} />
          <Arrow />
          <FlowStep step="4" title="Plaintext Restored" color="lime"
            desc="Jika verifikasi berhasil, plaintext dikembalikan ke client. Audit log dicatat dengan IP address dan username."
            code={`plaintext = decipher.update(ciphertext) + decipher.final()\n→ JSON.parse(plaintext) → return to client`} />
        </div>
      </section>

      {/* Threat Model */}
      <section>
        <h2 className="text-[11px] font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Icons.AlertTriangle width={14} height={14} /> Threat Model & Mitigasi
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ThreatCard threat="Brute Force Attack" level="high" icon={Icons.Key}
            mitigation="bcrypt (cost 12) untuk login. PBKDF2 310K iterasi untuk enkripsi. Rate limiter 5 percobaan/15 menit. Account lockout otomatis." />
          <ThreatCard threat="Database Leak" level="high" icon={Icons.AlertTriangle}
            mitigation="Password disimpan sebagai bcrypt hash. Data transaksi sensitif dienkripsi AES-256-GCM. Plaintext TIDAK PERNAH tersimpan di DB." />
          <ThreatCard threat="Unauthorized Access" level="high" icon={Icons.Lock}
            mitigation="JWT dengan expiry 15 menit. Refresh token di HttpOnly cookie. RBAC di backend (bukan hanya frontend). Semua endpoint diproteksi." />
          <ThreatCard threat="Data Tampering" level="medium" icon={Icons.ShieldCheck}
            mitigation="AES-256-GCM menghasilkan authentication tag. Jika ciphertext dimodifikasi satu bit pun, dekripsi GAGAL dengan error. SHA-256 checksum untuk audit." />
          <ThreatCard threat="Credential Theft" level="medium" icon={Icons.User}
            mitigation="Access token hanya di memory (bukan localStorage). Refresh token HttpOnly cookie (tidak bisa diakses JavaScript). Secure + SameSite=Strict cookie flag." />
          <ThreatCard threat="XSS & Injection" level="medium" icon={Icons.XCircle}
            mitigation="Input sanitasi menggunakan express-validator (.escape()). Parameterized queries di semua SQL. Content-Security-Policy via Helmet." />
          <ThreatCard threat="Insider Attack" level="medium" icon={Icons.Activity}
            mitigation="Audit log immutable mencatat semua aksi. Master key tidak disimpan di DB. Decrypt memerlukan key yang hanya dimiliki user bersangkutan." />
          <ThreatCard threat="DoS / Rate Abuse" level="low" icon={Icons.Info}
            mitigation="Global rate limiter 100 req/15 menit. Login limiter 5 req/15 menit. Body size limit 10KB. Helmet secure headers." />
        </div>
      </section>

      {/* Comparison table */}
      <section>
        <h2 className="text-[11px] font-black text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Icons.Cpu width={14} height={14} /> Perbandingan: Prototype vs AGRISAVE.IO v2
        </h2>
        <div className="card top-highlight overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/[0.03] border-b border-white/[0.06]">
              <tr>
                <th className="tbl-head">Aspek</th>
                <th className="tbl-head text-red-400">Prototype Lama</th>
                <th className="tbl-head text-lime-400">AGRISAVE.IO v2</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Enkripsi', 'AES-CBC (no auth)', 'AES-256-GCM (AEAD)'],
                ['Key Derivation', 'Password langsung (padEnd 16)', 'PBKDF2-SHA512 (310K iterasi)'],
                ['Password Storage', 'Plaintext di localStorage', 'bcrypt hash di database'],
                ['Database', 'localStorage (browser)', 'SQLite/PostgreSQL (server)'],
                ['Autentikasi', 'String compare langsung', 'JWT + HttpOnly refresh token'],
                ['RBAC', 'Frontend only (bypassable)', 'Backend enforcement per endpoint'],
                ['Audit Log', 'Tidak ada', 'Immutable log semua aktivitas'],
                ['Rate Limiting', 'Tidak ada', 'Login 5x/15m, Global 100x/15m'],
                ['Input Validation', 'Tidak ada', 'express-validator + escape XSS'],
                ['Data Integrity', 'Tidak ada', 'Auth tag + SHA-256 checksum'],
              ].map(([a, old, newV]) => (
                <tr key={a} className="tbl-row">
                  <td className="tbl-cell font-black text-white text-xs">{a}</td>
                  <td className="tbl-cell text-red-400/70 text-xs">{old}</td>
                  <td className="tbl-cell text-lime-400 text-xs font-bold">{newV}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
