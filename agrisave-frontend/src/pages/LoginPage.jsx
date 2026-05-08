/**
 * AGRISAVE.IO - Login Page
 * 
 * Features:
 * - bcrypt auth via backend (tidak ada plaintext compare)
 * - Show remaining attempts warning
 * - Account locked feedback
 * - Persistent login via refresh token (HttpOnly cookie)
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Icons } from '../utils/ui';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, refreshAuth } = useAuthStore();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(null);

  // Auto-redirect jika sudah login
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
      return;
    }
    // Hanya coba refresh jika ada backend (VITE_API_URL tersedia)
    if (import.meta.env.VITE_API_URL || import.meta.env.DEV) {
      refreshAuth().then((ok) => { if (ok) navigate('/dashboard'); });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form.username, form.password);
    if (result.success) {
      toast.success('Login berhasil!');
      navigate('/dashboard');
    } else {
      setError(result.message);
      if (result.attemptsLeft !== undefined) setAttemptsLeft(result.attemptsLeft);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-20 left-20 text-8xl font-black text-white/[0.02] animate-float select-none">AGRISAVE</div>
        <div className="absolute bottom-20 right-20 text-7xl font-black text-white/[0.02] animate-float select-none" style={{ animationDelay: '2s' }}>VAULT</div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Card */}
        <div className="card top-highlight p-10 shadow-2xl text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-lime-400 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(190,242,100,0.4)] animate-glow-pulse">
              <Icons.Shield className="text-black" width={32} height={32} />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-1">
            AGRISAVE<span className="text-lime-400">.IO</span>
          </h1>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.4em] mb-8">
            Secure Agricultural Financial Vault
          </p>

          {/* Security badges */}
          <div className="flex justify-center gap-2 mb-8 flex-wrap">
            {['AES-256-GCM', 'PBKDF2', 'JWT + RBAC'].map((b) => (
              <span key={b} className="badge badge-lime text-[9px]">
                <Icons.ShieldCheck width={9} height={9} />{b}
              </span>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block ml-1">Username</label>
              <input
                id="login-username"
                type="text"
                className="input-base"
                placeholder="username"
                autoComplete="username"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block ml-1">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  className="input-base pr-12"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                  {showPass ? <Icons.EyeOff width={16} height={16} /> : <Icons.Eye width={16} height={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                <p className="text-red-400 text-xs font-bold">{error}</p>
                {attemptsLeft !== null && attemptsLeft > 0 && (
                  <p className="text-red-400/70 text-[10px] mt-1">{attemptsLeft} percobaan tersisa sebelum akun dikunci.</p>
                )}
              </div>
            )}

            <button id="login-submit" type="submit" disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {isLoading
                ? <><Icons.RefreshCw width={14} height={14} className="animate-spin" /> Verifying...</>
                : <><Icons.Lock width={14} height={14} /> Authorize Access</>}
            </button>
          </form>

          <p className="text-[10px] text-gray-600 mt-8 font-mono">
            AGRISAVE.IO · Universitas Bengkulu 2026
          </p>
        </div>

        {/* Default credentials hint (dev only) */}
        <div className="mt-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 text-center">
          <p className="text-[10px] text-yellow-500/60 font-mono">
            DEV HINT · super_admin / Admin@2026! · (Hapus sebelum production)
          </p>
        </div>
      </div>
    </div>
  );
}
