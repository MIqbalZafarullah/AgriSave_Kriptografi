/**
 * AGRISAVE.IO - Dashboard Page
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Icons, formatRupiah, formatDateTime } from '../utils/ui';

const StatCard = ({ label, value, icon: Icon, color = 'lime', sub }) => (
  <div className="stat-card">
    <div className="flex items-start justify-between mb-4">
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</p>
      <div className={`p-2 rounded-xl ${color === 'lime' ? 'bg-lime-400/10 text-lime-400' : color === 'red' ? 'bg-red-500/10 text-red-400' : color === 'blue' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
        <Icon width={16} height={16} />
      </div>
    </div>
    <p className={`text-2xl font-black tracking-tight ${color === 'lime' ? 'text-lime-400' : color === 'red' ? 'text-red-400' : color === 'blue' ? 'text-blue-400' : 'text-white'}`}>{value}</p>
    {sub && <p className="text-[10px] text-gray-600 mt-1">{sub}</p>}
  </div>
);

const actionColor = { LOGIN: 'text-lime-400', LOGOUT: 'text-gray-400', DECRYPT: 'text-blue-400', ADD_TRANSACTION: 'text-green-400', DELETE_TRANSACTION: 'text-red-400', FAILED_LOGIN: 'text-red-500', FAILED_DECRYPT: 'text-red-500', USER_CREATED: 'text-purple-400' };

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then(r => { setStats(r.data.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const chartData = stats ? [
    { name: 'Modal', value: stats.transactions?.total_modal || 0, fill: '#ef4444' },
    { name: 'Panen', value: stats.transactions?.total_panen || 0, fill: '#bef264' },
  ] : [];

  const balance = (stats?.transactions?.total_panen || 0) - (stats?.transactions?.total_modal || 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Icons.RefreshCw className="text-lime-400 animate-spin" width={32} height={32} />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Selamat datang, <span className="text-lime-400">{user?.full_name?.split(' ')[0]}</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          AGRISAVE.IO Secure Financial Vault · {new Date().toLocaleDateString('id-ID', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Modal" value={formatRupiah(stats?.transactions?.total_modal)} icon={Icons.TrendingDown} color="red" sub="Total pinjaman modal" />
        <StatCard label="Total Panen" value={formatRupiah(stats?.transactions?.total_panen)} icon={Icons.TrendingUp} color="lime" sub="Total setoran panen" />
        <StatCard label="Net Balance" value={formatRupiah(Math.abs(balance))} icon={Icons.Activity} color={balance >= 0 ? 'blue' : 'red'} sub={balance >= 0 ? '▲ Surplus' : '▼ Defisit'} />
        <StatCard label="Total Records" value={stats?.transactions?.total_records || 0} icon={Icons.FileText} color="purple" sub={`${stats?.overdueCount || 0} overdue`} />
      </div>

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="card p-6 top-highlight flex flex-col items-center justify-center">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 self-start">Komposisi Dana</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip formatter={(v) => formatRupiah(v)} contentStyle={{ background: '#0a0c10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            {chartData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                <span className="text-[10px] text-gray-400 font-bold">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6 top-highlight lg:col-span-2">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Aktivitas Terbaru</p>
          <div className="space-y-2">
            {(stats?.recentActivity || []).map((log, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-400/60" />
                  <div>
                    <span className={`text-xs font-black ${actionColor[log.action] || 'text-gray-400'}`}>{log.action?.replace(/_/g,' ')}</span>
                    <span className="text-gray-600 text-xs ml-2">by {log.username}</span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-600 font-mono">{formatDateTime(log.created_at)}</span>
              </div>
            ))}
            {!stats?.recentActivity?.length && <p className="text-gray-600 text-sm text-center py-4">Belum ada aktivitas.</p>}
          </div>
        </div>
      </div>

      {/* Security Status */}
      <div className="card p-6 top-highlight">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Security Status</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Encryption', value: 'AES-256-GCM', ok: true },
            { label: 'Key Derivation', value: 'PBKDF2-SHA512', ok: true },
            { label: 'Authentication', value: 'JWT + bcrypt', ok: true },
            { label: 'Rate Limiting', value: 'Active', ok: true },
          ].map((s) => (
            <div key={s.label} className="bg-white/[0.03] rounded-2xl p-4 flex items-start gap-3">
              <Icons.CheckCircle className="text-lime-400 mt-0.5 flex-shrink-0" width={14} height={14} />
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black">{s.label}</p>
                <p className="text-xs text-white font-mono mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overdue Warning */}
      {stats?.overdueCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
          <Icons.AlertTriangle className="text-red-400 flex-shrink-0" width={20} height={20} />
          <div>
            <p className="text-sm font-black text-red-400">{stats.overdueCount} Transaksi Overdue</p>
            <p className="text-xs text-red-400/60">Terdapat modal yang melewati batas tenggat panen.</p>
          </div>
          <button onClick={() => navigate('/transactions')} className="ml-auto btn-danger btn-sm">Lihat</button>
        </div>
      )}
    </div>
  );
}
