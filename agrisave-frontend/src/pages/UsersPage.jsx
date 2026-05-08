/**
 * AGRISAVE.IO - User Management Page (SUPER_ADMIN only)
 */
import { useEffect, useState } from 'react';
import api from '../services/api';
import { Icons, RoleBadge, formatDateTime } from '../utils/ui';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export default function UsersPage() {
  const { user: me } = useAuthStore();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleModal, setRM]    = useState(null);
  const [newRole, setNR]      = useState('');

  const fetch = async () => {
    setLoading(true);
    try { const r = await api.get('/admin/users'); setUsers(r.data.data); }
    catch { toast.error('Gagal memuat users.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const handleRoleChange = async () => {
    try {
      await api.put(`/admin/users/${roleModal.id}/role`, { role: newRole });
      toast.success(`Role ${roleModal.username} diubah ke ${newRole}.`);
      setRM(null); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal ubah role.'); }
  };

  const handleToggle = async (u) => {
    try {
      await api.put(`/admin/users/${u.id}/toggle-active`);
      toast.success(`User ${u.username} ${u.is_active ? 'dinonaktifkan' : 'diaktifkan'}.`);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal toggle.'); }
  };

  const handleUnlock = async (u) => {
    try { await api.post(`/admin/users/${u.id}/unlock`); toast.success('Akun dibuka kuncinya.'); fetch(); }
    catch { toast.error('Gagal unlock.'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">SUPER_ADMIN · Kelola akun dan role pengguna sistem</p>
        </div>
        <button onClick={fetch} className="btn-ghost flex items-center gap-2 btn-sm">
          <Icons.RefreshCw width={14} height={14} /> Refresh
        </button>
      </div>

      <div className="card top-highlight overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/[0.03] border-b border-white/[0.06]">
              <tr>
                {['User','Email','Role','Status','Login Terakhir','Login Attempts','Aksi'].map((h) => (
                  <th key={h} className="tbl-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16"><Icons.RefreshCw className="text-lime-400 animate-spin mx-auto" width={28} height={28} /></td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="tbl-row">
                  <td className="tbl-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-lime-400/10 flex items-center justify-center text-lime-400 font-black text-sm">
                        {u.username?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-white text-xs">{u.username}</p>
                        <p className="text-[10px] text-gray-500">{u.full_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="tbl-cell text-gray-500 text-xs">{u.email}</td>
                  <td className="tbl-cell"><RoleBadge role={u.role} /></td>
                  <td className="tbl-cell">
                    {u.locked_until && new Date() < new Date(u.locked_until)
                      ? <span className="badge badge-red">LOCKED</span>
                      : u.is_active
                        ? <span className="badge badge-lime">Active</span>
                        : <span className="badge badge-red">Inactive</span>}
                  </td>
                  <td className="tbl-cell font-mono text-[11px] text-gray-600">{formatDateTime(u.last_login) || 'Never'}</td>
                  <td className="tbl-cell">
                    {u.login_attempts > 0
                      ? <span className="badge badge-yellow">{u.login_attempts}x</span>
                      : <span className="text-gray-600 text-xs">0</span>}
                  </td>
                  <td className="tbl-cell">
                    {u.id !== me?.id && (
                      <div className="flex gap-1.5">
                        <button onClick={() => { setRM(u); setNR(u.role); }}
                          className="p-1.5 bg-white/[0.04] rounded-lg text-gray-500 hover:text-lime-400 transition-colors" title="Ubah Role">
                          <Icons.Edit width={12} height={12} />
                        </button>
                        <button onClick={() => handleToggle(u)}
                          className={`p-1.5 bg-white/[0.04] rounded-lg transition-colors ${u.is_active ? 'text-gray-500 hover:text-yellow-400' : 'text-gray-500 hover:text-lime-400'}`}
                          title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                          {u.is_active ? <Icons.EyeOff width={12} height={12} /> : <Icons.Eye width={12} height={12} />}
                        </button>
                        {(u.login_attempts >= 3 || u.locked_until) && (
                          <button onClick={() => handleUnlock(u)}
                            className="p-1.5 bg-white/[0.04] rounded-lg text-gray-500 hover:text-blue-400 transition-colors" title="Unlock Akun">
                            <Icons.Unlock width={12} height={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Change Modal */}
      {roleModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setRM(null)}>
          <div className="modal-box max-w-sm animate-slide-up">
            <div className="p-8 text-center space-y-5">
              <Icons.Users className="text-lime-400 mx-auto" width={32} height={32} />
              <h2 className="text-lg font-black text-white">Ubah Role: {roleModal.username}</h2>
              <select className="input-base" value={newRole} onChange={(e) => setNR(e.target.value)}>
                {['SUPER_ADMIN','ADMIN','OPERATOR','VIEWER'].map((r) => (
                  <option key={r} value={r}>{r.replace('_',' ')}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <button onClick={handleRoleChange} className="btn-primary flex-1">Simpan</button>
                <button onClick={() => setRM(null)} className="btn-ghost flex-1">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
