/**
 * AGRISAVE.IO - Transactions Page
 * List + Add + Edit + Decrypt + Delete transaksi terenkripsi
 */
import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Icons, formatRupiah, formatDate, getAlertLevel, RoleBadge } from '../utils/ui';
import toast from 'react-hot-toast';
import DecryptModal from '../components/DecryptModal';
import TransactionModal from '../components/TransactionModal';
import DeleteModal from '../components/DeleteModal';

export default function TransactionsPage() {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Modal states
  const [showAdd, setShowAdd]         = useState(false);
  const [showDecrypt, setShowDecrypt] = useState(false);
  const [showDelete, setShowDelete]   = useState(false);
  const [selectedTx, setSelectedTx]  = useState(null);
  const [isEditing, setIsEditing]     = useState(false);

  const canAdd    = ['SUPER_ADMIN','ADMIN','OPERATOR'].includes(user?.role);
  const canEdit   = ['SUPER_ADMIN','ADMIN'].includes(user?.role);
  const canDelete = user?.role === 'SUPER_ADMIN';

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (search) params.set('search', search);
      if (filterJenis) params.set('jenis', filterJenis);
      const { data } = await api.get(`/transactions?${params}`);
      setTransactions(data.data.transactions);
      setStats(data.data.stats);
      setPagination(data.data.pagination);
    } catch { toast.error('Gagal memuat transaksi.'); }
    finally { setLoading(false); }
  }, [page, search, filterJenis]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleEdit = (tx) => { setSelectedTx(tx); setIsEditing(true); setShowAdd(true); };
  const handleDecrypt = (tx) => { setSelectedTx(tx); setShowDecrypt(true); };
  const handleDelete = (tx) => { setSelectedTx(tx); setShowDelete(true); };

  const onSuccess = () => { fetchTransactions(); setShowAdd(false); setShowDecrypt(false); setShowDelete(false); };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Transaksi Terenkripsi</h1>
          <p className="text-sm text-gray-500 mt-1">Data sensitif dilindungi AES-256-GCM + PBKDF2</p>
        </div>
        {canAdd && (
          <button id="btn-add-tx" onClick={() => { setSelectedTx(null); setIsEditing(false); setShowAdd(true); }} className="btn-primary flex items-center gap-2">
            <Icons.Plus width={16} height={16} /> New Entry
          </button>
        )}
      </div>

      {/* Stat mini */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { l: 'Total Modal', v: formatRupiah(stats.total_modal), c: 'text-red-400' },
            { l: 'Total Panen', v: formatRupiah(stats.total_panen), c: 'text-lime-400' },
            { l: 'Net Balance', v: formatRupiah(Math.abs(stats.total_panen - stats.total_modal)), c: (stats.total_panen - stats.total_modal) >= 0 ? 'text-blue-400' : 'text-red-400' },
          ].map((s) => (
            <div key={s.l} className="card p-4 top-highlight text-center">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{s.l}</p>
              <p className={`text-lg font-black mt-1 ${s.c}`}>{s.v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" width={16} height={16} />
          <input type="text" placeholder="Cari petani atau komoditas..."
            className="input-base pl-11"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input-base sm:w-44" value={filterJenis} onChange={(e) => { setFilterJenis(e.target.value); setPage(1); }}>
          <option value="">Semua Jenis</option>
          <option value="Modal">Modal</option>
          <option value="Panen">Panen</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Icons.RefreshCw className="text-lime-400 animate-spin" width={32} height={32} /></div>
      ) : transactions.length === 0 ? (
        <div className="card p-16 text-center top-highlight">
          <Icons.FileText className="text-gray-600 mx-auto mb-4" width={48} height={48} />
          <p className="text-gray-500 font-bold">Belum ada transaksi.</p>
          {canAdd && <button onClick={() => setShowAdd(true)} className="btn-primary mt-6 inline-flex items-center gap-2"><Icons.Plus width={14} height={14} />Tambah Pertama</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {transactions.map((tx) => {
            const al = getAlertLevel(tx.meta_tenggat);
            return (
              <div key={tx.id} className={`card top-highlight card-glow p-6 space-y-4 ${al === 'overdue' ? 'alert-overdue' : al === 'warning' ? 'border-yellow-500/30' : ''}`}>
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-xl ${tx.meta_jenis === 'Modal' ? 'bg-red-500/10 text-red-400' : 'bg-lime-400/10 text-lime-400'}`}>
                    {tx.meta_jenis === 'Modal' ? <Icons.TrendingDown width={16} height={16} /> : <Icons.TrendingUp width={16} height={16} />}
                  </div>
                  <div className="flex gap-1.5">
                    {canEdit && <button onClick={() => handleEdit(tx)} className="p-2 bg-white/[0.04] rounded-xl text-gray-500 hover:text-lime-400 transition-colors"><Icons.Edit width={13} height={13} /></button>}
                    {canDelete && <button onClick={() => handleDelete(tx)} className="p-2 bg-white/[0.04] rounded-xl text-gray-500 hover:text-red-400 transition-colors"><Icons.Trash width={13} height={13} /></button>}
                  </div>
                </div>

                {/* Info */}
                <div>
                  <p className="font-black text-white text-sm uppercase tracking-wide truncate">{tx.meta_petani}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{tx.meta_komoditas} · {tx.meta_kelompok}</p>
                </div>

                <div className="flex items-center justify-between">
                  <p className={`text-lg font-black ${tx.meta_jenis === 'Modal' ? 'text-red-400' : 'text-lime-400'}`}>{formatRupiah(tx.meta_nominal)}</p>
                  <span className={`badge text-[9px] ${tx.meta_jenis === 'Modal' ? 'badge-red' : 'badge-lime'}`}>{tx.meta_jenis}</span>
                </div>

                {/* Tenggat */}
                {tx.meta_tenggat && tx.meta_jenis === 'Modal' && (
                  <div className={`flex items-center gap-2 text-[10px] font-black uppercase ${al === 'overdue' ? 'text-red-400' : al === 'warning' ? 'text-yellow-400' : 'text-gray-500'}`}>
                    <Icons.Calendar width={11} height={11} />
                    Tenggat: {formatDate(tx.meta_tenggat)} {al === 'overdue' ? '⚠ OVERDUE' : al === 'warning' ? '⚠ SEGERA' : ''}
                  </div>
                )}

                {/* Ciphertext preview */}
                <div className="bg-black/40 rounded-xl p-3 border border-white/[0.04]">
                  <p className="font-mono text-[9px] text-lime-400/30 break-all line-clamp-2 italic leading-relaxed">{tx.id.slice(0,8)}...encrypted</p>
                </div>

                {/* Decrypt button */}
                <button onClick={() => handleDecrypt(tx)}
                  className="w-full py-3 bg-white/[0.04] hover:bg-lime-400 text-gray-400 hover:text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/[0.04]">
                  <Icons.Unlock width={13} height={13} /> Open Record
                </button>

                <p className="text-[9px] text-gray-600 font-mono">{tx.created_by_username} · {formatDate(tx.created_at)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-ghost btn-sm disabled:opacity-30">← Prev</button>
          <span className="text-xs text-gray-500 font-mono">Hal {page} / {pagination.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.totalPages, p+1))} disabled={page === pagination.totalPages} className="btn-ghost btn-sm disabled:opacity-30">Next →</button>
        </div>
      )}

      {/* Modals */}
      {showAdd    && <TransactionModal tx={isEditing ? selectedTx : null} onClose={() => setShowAdd(false)} onSuccess={onSuccess} />}
      {showDecrypt && <DecryptModal tx={selectedTx} onClose={() => setShowDecrypt(false)} />}
      {showDelete  && <DeleteModal tx={selectedTx} onClose={() => setShowDelete(false)} onSuccess={onSuccess} />}
    </div>
  );
}
