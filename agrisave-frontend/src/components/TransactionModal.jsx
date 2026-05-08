/**
 * AGRISAVE.IO - Transaction Add/Edit Modal
 */
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Icons } from '../utils/ui';
import toast from 'react-hot-toast';

const INIT = { petani: '', komoditas: '', nominal: '', jenis_transaksi: 'Modal', kelompok_tani: '', tenggat_panen: '', keterangan: '', master_key: '' };

export default function TransactionModal({ tx, onClose, onSuccess }) {
  const isEdit = !!tx;
  const [form, setForm] = useState(INIT);
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit) {
      setForm({
        petani: tx.meta_petani || '', komoditas: tx.meta_komoditas || '',
        nominal: tx.meta_nominal || '', jenis_transaksi: tx.meta_jenis || 'Modal',
        kelompok_tani: tx.meta_kelompok || '', tenggat_panen: tx.meta_tenggat || '',
        keterangan: '', master_key: '',
      });
    }
  }, [tx]);

  const f = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErrors({});
    try {
      const payload = { ...form, nominal: parseInt(form.nominal) };
      if (isEdit) await api.put(`/transactions/${tx.id}`, payload);
      else await api.post('/transactions', payload);
      toast.success(isEdit ? 'Transaksi diperbarui & dienkripsi ulang!' : 'Transaksi tersimpan & terenkripsi!');
      onSuccess();
    } catch (err) {
      if (err.response?.data?.details) {
        const errs = {};
        err.response.data.details.forEach((d) => { errs[d.field] = d.message; });
        setErrors(errs);
      } else {
        toast.error(err.response?.data?.message || 'Gagal menyimpan transaksi.');
      }
    } finally { setLoading(false); }
  };

  const Field = ({ label, name, type = 'text', children, required = false, ...rest }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children || (
        <input type={type} name={name} className={`input-base ${errors[name] ? 'border-red-500/50' : ''}`}
          value={form[name] || ''} onChange={(e) => f(name, e.target.value)} {...rest} />
      )}
      {errors[name] && <p className="text-red-400 text-[10px] ml-1">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-2xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-lime-400 p-5 text-black flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">{isEdit ? 'Update Entry' : 'Cipher Entry'}</h2>
            <p className="text-[9px] font-black uppercase opacity-60">Data akan dienkripsi AES-256-GCM + PBKDF2</p>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform"><Icons.X width={20} height={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nama Petani" name="petani" required placeholder="Nama petani..." />
            <Field label="Komoditas" name="komoditas" required placeholder="Padi, Jagung, dll..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kelompok Tani" name="kelompok_tani" placeholder="Nama kelompok..." />
            <Field label="Jenis Transaksi" name="jenis_transaksi" required>
              <select name="jenis_transaksi" className="input-base" value={form.jenis_transaksi} onChange={(e) => f('jenis_transaksi', e.target.value)}>
                <option value="Modal">Pinjaman Modal</option>
                <option value="Panen">Setoran Panen</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nominal (Rp)" name="nominal" type="number" required placeholder="0" min="1" />
            <Field label="Tenggat Panen" name="tenggat_panen" type="date"
              required={false}
              disabled={form.jenis_transaksi !== 'Modal'} />
          </div>
          <Field label="Keterangan" name="keterangan" placeholder="Catatan tambahan (opsional)..." />

          {/* Master Key */}
          <div className="bg-lime-400/5 border border-lime-400/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Icons.Key className="text-lime-400" width={16} height={16} />
              <p className="text-[10px] font-black text-lime-400 uppercase tracking-widest">
                {isEdit ? 'Masukkan Master Key Lama (untuk validasi) + Key Baru Enkripsi' : 'Master Key Enkripsi'}
              </p>
            </div>
            <div className="relative">
              <input id="tx-master-key" type={showKey ? 'text' : 'password'} className={`input-base pr-12 text-center tracking-widest ${errors.master_key ? 'border-red-500/50' : ''}`}
                placeholder="Minimal 8 karakter" required minLength={8}
                value={form.master_key} onChange={(e) => f('master_key', e.target.value)} />
              <button type="button" onClick={() => setShowKey(!showKey)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                {showKey ? <Icons.EyeOff width={16} height={16} /> : <Icons.Eye width={16} height={16} />}
              </button>
            </div>
            {errors.master_key && <p className="text-red-400 text-[10px]">{errors.master_key}</p>}
            <p className="text-[9px] text-gray-600">⚠ Simpan master key ini. Tanpanya data TIDAK DAPAT didekripsi.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <><Icons.RefreshCw width={14} height={14} className="animate-spin" />Encrypting...</>
                : <><Icons.Lock width={14} height={14} />{isEdit ? 'Re-Encrypt & Update' : 'Secure & Store'}</>}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Batal</button>
          </div>
        </form>
      </div>
    </div>
  );
}
