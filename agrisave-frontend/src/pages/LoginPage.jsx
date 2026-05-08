/**
 * AGRISAVE.IO - Login + Register Page
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Icons } from '../utils/ui';
import api from '../services/api';
import toast from 'react-hot-toast';

const INIT_LOGIN    = { username: '', password: '' };
const INIT_REGISTER = { username: '', email: '', full_name: '', password: '', confirm_password: '' };

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, refreshAuth } = useAuthStore();

  const [mode, setMode]             = useState('login'); // 'login' | 'register'
  const [loginForm, setLoginForm]   = useState(INIT_LOGIN);
  const [regForm, setRegForm]       = useState(INIT_REGISTER);
  const [showPass, setShowPass]     = useState(false);
  const [showPass2, setShowPass2]   = useState(false);
  const [error, setError]           = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [attemptsLeft, setAL]       = useState(null);

  useEffect(() => {
    if (isAuthenticated) { navigate('/dashboard'); return; }
    if (import.meta.env.VITE_API_URL || import.meta.env.DEV) {
      refreshAuth().then((ok) => { if (ok) navigate('/dashboard'); });
    }
  }, []);

  const switchMode = (m) => { setMode(m); setError(''); };

  // ── LOGIN ──
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(loginForm.username, loginForm.password);
    if (result.success) {
      toast.success('Login berhasil!');
      navigate('/dashboard');
    } else {
      setError(result.message);
      if (result.attemptsLeft !== undefined) setAL(result.attemptsLeft);
    }
  };

  // ── REGISTER ──
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Validasi password match
    if (regForm.password !== regForm.confirm_password) {
      setError('Password dan Konfirmasi Password tidak cocok.');
      return;
    }
    if (regForm.password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(regForm.password)) {
      setError('Password harus ada huruf besar, huruf kecil, angka, dan simbol (@$!%*?&).');
      return;
    }

    setRegLoading(true);
    try {
      await api.post('/auth/register', {
        username:  regForm.username,
        email:     regForm.email,
        full_name: regForm.full_name,
        password:  regForm.password,
        role:      'OPERATOR', // default role untuk registrasi publik
      });
      toast.success('Akun berhasil dibuat! Silakan login.');
      setRegForm(INIT_REGISTER);
      setMode('login');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registrasi gagal.';
      const details = err.response?.data?.details;
      setError(details ? details.map((d) => d.message).join(' · ') : msg);
    } finally {
      setRegLoading(false);
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
        <div className="card top-highlight p-8 shadow-2xl text-center">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-lime-400 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(190,242,100,0.4)] animate-glow-pulse">
              <Icons.Shield className="text-black" width={28} height={28} />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">
            AGRISAVE<span className="text-lime-400">.IO</span>
          </h1>
          <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.4em] mb-5">
            Secure Agricultural Financial Vault
          </p>

          {/* Security badges */}
          <div className="flex justify-center gap-1.5 mb-5 flex-wrap">
            {['AES-256-GCM', 'PBKDF2', 'JWT'].map((b) => (
              <span key={b} className="badge badge-lime text-[9px]">
                <Icons.ShieldCheck width={8} height={8} />{b}
              </span>
            ))}
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-white/[0.04] rounded-2xl p-1 mb-6">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-lime-400 text-black' : 'text-gray-500 hover:text-white'}`}
            >
              <Icons.Lock className="inline mr-1.5" width={12} height={12} />
              Login
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-lime-400 text-black' : 'text-gray-500 hover:text-white'}`}
            >
              <Icons.User className="inline mr-1.5" width={12} height={12} />
              Sign Up
            </button>
          </div>

          {/* ── LOGIN FORM ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Username</label>
                <input id="login-username" type="text" className="input-base" placeholder="username"
                  autoComplete="username" required
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Password</label>
                <div className="relative">
                  <input id="login-password" type={showPass ? 'text' : 'password'} className="input-base pr-12"
                    placeholder="••••••••" autoComplete="current-password" required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    {showPass ? <Icons.EyeOff width={15} height={15} /> : <Icons.Eye width={15} height={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3">
                  <p className="text-red-400 text-xs font-bold">{error}</p>
                  {attemptsLeft !== null && attemptsLeft > 0 && (
                    <p className="text-red-400/70 text-[10px] mt-1">{attemptsLeft} percobaan tersisa.</p>
                  )}
                </div>
              )}

              <button id="login-submit" type="submit" disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {isLoading
                  ? <><Icons.RefreshCw width={14} height={14} className="animate-spin" />Verifying...</>
                  : <><Icons.Lock width={14} height={14} />Authorize Access</>}
              </button>

              <p className="text-center text-[10px] text-gray-600 pt-1">
                Belum punya akun?{' '}
                <button type="button" onClick={() => switchMode('register')}
                  className="text-lime-400 font-black hover:underline">Daftar di sini</button>
              </p>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3 text-left">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Nama Lengkap</label>
                <input id="reg-fullname" type="text" className="input-base" placeholder="Nama lengkap Anda" required
                  value={regForm.full_name}
                  onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Username</label>
                <input id="reg-username" type="text" className="input-base" placeholder="username (huruf, angka, _)" required
                  pattern="^[a-zA-Z0-9_]+"
                  value={regForm.username}
                  onChange={(e) => setRegForm({ ...regForm, username: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Email</label>
                <input id="reg-email" type="email" className="input-base" placeholder="email@example.com" required
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Password</label>
                <div className="relative">
                  <input id="reg-password" type={showPass ? 'text' : 'password'} className="input-base pr-12"
                    placeholder="Min 8 karakter + simbol" required minLength={8}
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    {showPass ? <Icons.EyeOff width={15} height={15} /> : <Icons.Eye width={15} height={15} />}
                  </button>
                </div>
                <p className="text-[9px] text-gray-600 ml-1 mt-1">Harus ada: Huruf besar, huruf kecil, angka, simbol (@$!%*?&)</p>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Konfirmasi Password</label>
                <div className="relative">
                  <input id="reg-confirm" type={showPass2 ? 'text' : 'password'} className="input-base pr-12"
                    placeholder="Ulangi password" required
                    value={regForm.confirm_password}
                    onChange={(e) => setRegForm({ ...regForm, confirm_password: e.target.value })} />
                  <button type="button" onClick={() => setShowPass2(!showPass2)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    {showPass2 ? <Icons.EyeOff width={15} height={15} /> : <Icons.Eye width={15} height={15} />}
                  </button>
                </div>
              </div>

              {/* Role info */}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 flex items-start gap-2">
                <Icons.Info className="text-blue-400 flex-shrink-0 mt-0.5" width={13} height={13} />
                <p className="text-[10px] text-blue-400/80">Akun baru otomatis mendapat role <strong>OPERATOR</strong>. Role dapat diubah oleh SUPER_ADMIN.</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3">
                  <p className="text-red-400 text-xs font-bold">{error}</p>
                </div>
              )}

              <button id="reg-submit" type="submit" disabled={regLoading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {regLoading
                  ? <><Icons.RefreshCw width={14} height={14} className="animate-spin" />Creating Account...</>
                  : <><Icons.User width={14} height={14} />Daftar Sekarang</>}
              </button>

              <p className="text-center text-[10px] text-gray-600 pt-1">
                Sudah punya akun?{' '}
                <button type="button" onClick={() => switchMode('login')}
                  className="text-lime-400 font-black hover:underline">Login</button>
              </p>
            </form>
          )}

          <p className="text-[10px] text-gray-700 mt-6 font-mono">
            AGRISAVE.IO · Universitas Bengkulu 2026
          </p>
        </div>

        {/* Dev hint */}
        {import.meta.env.DEV && (
          <div className="mt-3 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-3 text-center">
            <p className="text-[10px] text-yellow-500/50 font-mono">
              DEV · super_admin / Admin@2026!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
