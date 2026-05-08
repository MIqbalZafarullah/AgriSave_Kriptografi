/**
 * AGRISAVE.IO - Delete Confirmation Modal (SUPER_ADMIN only)
 */
import { useState } from 'react';
import api from '../services/api';
import { Icons } from '../utils/ui';
import toast from 'react-hot-toast';

export default function DeleteModal({ tx, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/transactions/${tx.id}`);
      toast.success('Transaksi berhasil dihapus.');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md text-center animate-slide-up">
        <div className="p-10 space-y-5">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <Icons.Trash className="text-red-400" width={28} height={28} />
          </div>
          <h2 className="text-xl font-black text-white">Hapus Transaksi?</h2>
          <div className="bg-white/[0.04] rounded-2xl p-4">
            <p className="text-sm font-black text-white">{tx.meta_petani}</p>
            <p className="text-xs text-gray-500 mt-1">{tx.meta_komoditas} · {tx.meta_jenis}</p>
          </div>
          <p className="text-xs text-gray-500">Transaksi akan dihapus (soft delete) dan dicatat dalam audit log. Hanya SUPER_ADMIN yang dapat melakukan ini.</p>
          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={loading} className="btn-danger flex-1 flex items-center justify-center gap-2">
              {loading ? <Icons.RefreshCw width={14} height={14} className="animate-spin" /> : <Icons.Trash width={14} height={14} />}
              Hapus Sekarang
            </button>
            <button onClick={onClose} className="btn-ghost flex-1">Batal</button>
          </div>
        </div>
      </div>
    </div>
  );
}
