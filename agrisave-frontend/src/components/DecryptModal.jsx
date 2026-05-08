/**
 * AGRISAVE.IO - Decrypt Modal
 * Mendekripsi transaksi dengan AES-256-GCM melalui backend.
 * Hasil: plaintext + SHA-256 verification + PDF export.
 */
import { useState } from 'react';
import { jsPDF } from 'jspdf';
import api from '../services/api';
import { Icons, formatRupiah, formatDateTime } from '../utils/ui';
import toast from 'react-hot-toast';

export default function DecryptModal({ tx, onClose }) {
  const [key, setKey]         = useState('');
  const [showKey, setShowKey] = useState(false);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleDecrypt = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post(`/transactions/${tx.id}/decrypt`, { master_key: key });
      setData(res.data.data);
      toast.success('Dekripsi berhasil! Auth tag verified.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Dekripsi gagal.';
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const generatePDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    const now = new Date().toLocaleString('id-ID');

    // Header
    doc.setFillColor(190, 242, 100);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text('AGRISAVE.IO', 20, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('SECURE TRANSACTION RECEIPT · AES-256-GCM VERIFIED', 20, 30);

    // Body
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DETAIL TRANSAKSI', 20, 55);
    doc.setDrawColor(190, 242, 100);
    doc.setLineWidth(0.5);
    doc.line(20, 58, 190, 58);

    const fields = [
      ['ID Transaksi', `AGRI-${tx.id.slice(0,8).toUpperCase()}`],
      ['Nama Petani', (data.petani || '').toUpperCase()],
      ['Komoditas', (data.komoditas || '').toUpperCase()],
      ['Kelompok Tani', data.kelompok_tani || 'Umum'],
      ['Jenis Transaksi', data.jenis_transaksi],
      ['Nominal', formatRupiah(data.nominal)],
      ['Tenggat Panen', data.tenggat_panen || '-'],
      ['Keterangan', data.keterangan || '-'],
      ['Dibuat Oleh', data.created_by || '-'],
      ['Waktu Transaksi', formatDateTime(data.created_at)],
    ];

    let y = 68;
    fields.forEach(([k, v]) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(k, 20, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(String(v), 80, y);
      y += 9;
    });

    // Security block
    y += 5;
    doc.setFillColor(10, 12, 16);
    doc.roundedRect(20, y, 170, 42, 3, 3, 'F');
    doc.setTextColor(190, 242, 100);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('SECURITY VERIFICATION', 25, y + 9);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(`TX Hash   : ${data.transaction_hash}`, 25, y + 18);
    doc.text(`Checksum  : ${data.encryption_checksum}`, 25, y + 26);
    doc.text(`Algorithm : AES-256-GCM + PBKDF2-SHA512 (310,000 iter)`, 25, y + 34);

    // Footer
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generated: ${now} · AGRISAVE.IO v2.0 · Universitas Bengkulu 2026`, 20, 270);
    doc.text('Dokumen ini digenerate otomatis oleh sistem enkripsi AGRISAVE.', 20, 276);

    doc.save(`Struk_Agrisave_${tx.id.slice(0,8)}.pdf`);
    toast.success('PDF berhasil didownload!');
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-lg">
        {!data ? (
          /* ─── Key Input ─── */
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-lime-400/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Icons.Lock className="text-lime-400" width={28} height={28} />
            </div>
            <h2 className="text-xl font-black text-white mb-1">Authorization Required</h2>
            <p className="text-xs text-gray-500 mb-6">Masukkan Master Key untuk mendekripsi dengan AES-256-GCM</p>

            <div className="bg-lime-400/5 border border-lime-400/20 rounded-2xl p-3 mb-6 text-left">
              <p className="text-[10px] font-mono text-lime-400/60 truncate">
                ID: {tx.id} · {tx.meta_petani}
              </p>
            </div>

            <form onSubmit={handleDecrypt} className="space-y-4 text-left">
              <div className="relative">
                <input
                  id="decrypt-key"
                  type={showKey ? 'text' : 'password'}
                  className="input-base text-center text-lg tracking-widest pr-12"
                  placeholder="Master Key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  autoFocus required
                />
                <button type="button" onClick={() => setShowKey(!showKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  {showKey ? <Icons.EyeOff width={16} height={16} /> : <Icons.Eye width={16} height={16} />}
                </button>
              </div>
              {error && <p className="text-red-400 text-xs font-bold text-center bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>}
              <button type="submit" disabled={loading || !key} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <><Icons.RefreshCw width={14} height={14} className="animate-spin" />Decrypting...</> : <><Icons.Unlock width={14} height={14} />Verify & Decrypt</>}
              </button>
              <button type="button" onClick={onClose} className="btn-ghost w-full">Batal</button>
            </form>
          </div>
        ) : (
          /* ─── Decrypted Data ─── */
          <div>
            <div className="bg-lime-400 p-6 text-black flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Transaction Restored</h2>
                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">STATUS: DECRYPTED_SUCCESS · AUTH TAG VERIFIED</p>
              </div>
              <Icons.ShieldCheck width={40} height={40} />
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.04] rounded-2xl p-4">
                  <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Tipe</p>
                  <p className={`text-lg font-black mt-1 ${data.jenis_transaksi === 'Panen' ? 'text-lime-400' : 'text-red-400'}`}>
                    {data.jenis_transaksi === 'Panen' ? 'Pemasukan' : 'Pengeluaran'}
                  </p>
                </div>
                <div className="bg-white/[0.04] rounded-2xl p-4">
                  <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Nominal</p>
                  <p className="text-lg font-black text-white mt-1">{formatRupiah(data.nominal)}</p>
                </div>
              </div>
              {[
                { l: 'Petani', v: data.petani },
                { l: 'Komoditas', v: data.komoditas },
                { l: 'Kelompok Tani', v: data.kelompok_tani },
                { l: 'Dibuat Oleh', v: data.created_by },
                { l: 'Waktu', v: formatDateTime(data.created_at) },
                { l: 'Keterangan', v: data.keterangan || '-' },
              ].map((f) => (
                <div key={f.l} className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <p className="text-[10px] text-gray-500 font-black uppercase w-28 flex-shrink-0 mt-0.5">{f.l}</p>
                  <p className="text-sm text-white font-medium">{f.v}</p>
                </div>
              ))}

              {/* Security hashes */}
              <div className="bg-black/40 rounded-2xl p-4 border border-lime-400/10">
                <p className="text-[9px] font-black text-lime-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Icons.ShieldCheck width={10} height={10} /> Security Verification
                </p>
                <p className="font-mono text-[9px] text-gray-500 break-all">TX: {data.transaction_hash}</p>
                <p className="font-mono text-[9px] text-gray-600 break-all mt-1">CS: {data.encryption_checksum}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={generatePDF} className="btn-primary flex-1 flex items-center justify-center gap-2 text-xs">
                  <Icons.Printer width={14} height={14} /> Export PDF
                </button>
                <button onClick={onClose} className="btn-ghost flex-1">Tutup Sesi</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
