/**
 * AGRISAVE.IO - Audit Log Page (ADMIN & SUPER_ADMIN)
 */
import { useEffect, useState } from 'react';
import api from '../services/api';
import { Icons, formatDateTime } from '../utils/ui';
import toast from 'react-hot-toast';

const STATUS_COLOR = { SUCCESS: 'badge-lime', FAILED: 'badge-red', WARNING: 'badge-yellow' };
const ACTION_COLOR = {
  LOGIN: 'text-lime-400', LOGOUT: 'text-gray-400', DECRYPT: 'text-blue-400',
  ADD_TRANSACTION: 'text-green-400', EDIT_TRANSACTION: 'text-yellow-400',
  DELETE_TRANSACTION: 'text-red-400', FAILED_LOGIN: 'text-red-500',
  FAILED_DECRYPT: 'text-red-500', USER_CREATED: 'text-purple-400',
  USER_ROLE_CHANGED: 'text-orange-400',
};

export default function AuditPage() {
  const [logs, setLogs]         = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [pagination, setPag]    = useState(null);
  const [filterAction, setFA]   = useState('');
  const [filterStatus, setFS]   = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (filterAction) params.set('action', filterAction);
      if (filterStatus) params.set('status', filterStatus);
      const [logsRes, sumRes] = await Promise.all([
        api.get(`/audit?${params}`),
        api.get('/audit/summary'),
      ]);
      setLogs(logsRes.data.data.logs);
      setPag(logsRes.data.data.pagination);
      setSummary(sumRes.data.data);
    } catch { toast.error('Gagal memuat audit log.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [page, filterAction, filterStatus]);

  const actions = ['LOGIN','LOGOUT','DECRYPT','ADD_TRANSACTION','EDIT_TRANSACTION','DELETE_TRANSACTION','FAILED_LOGIN','FAILED_DECRYPT','USER_CREATED'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">Immutable log seluruh aktivitas sistem · Tidak dapat diedit atau dihapus</p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summary.actionStats?.slice(0,4).map((s) => (
            <div key={`${s.action}-${s.status}`} className="card p-4 top-highlight text-center">
              <p className={`text-xs font-black ${ACTION_COLOR[s.action] || 'text-gray-400'}`}>{s.action?.replace(/_/g,' ')}</p>
              <p className="text-2xl font-black text-white mt-1">{s.count}</p>
              <span className={`${STATUS_COLOR[s.status] || 'badge'} text-[9px] mt-1`}>{s.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select className="input-base sm:w-56" value={filterAction} onChange={(e) => { setFA(e.target.value); setPage(1); }}>
          <option value="">Semua Action</option>
          {actions.map((a) => <option key={a} value={a}>{a.replace(/_/g,' ')}</option>)}
        </select>
        <select className="input-base sm:w-44" value={filterStatus} onChange={(e) => { setFS(e.target.value); setPage(1); }}>
          <option value="">Semua Status</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
          <option value="WARNING">WARNING</option>
        </select>
        <button onClick={fetchLogs} className="btn-ghost flex items-center gap-2 sm:w-auto">
          <Icons.RefreshCw width={14} height={14} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="card top-highlight overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/[0.03] border-b border-white/[0.06]">
              <tr>
                {['Waktu','User','Role','Action','Target','IP Address','Status'].map((h) => (
                  <th key={h} className="tbl-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16"><Icons.RefreshCw className="text-lime-400 animate-spin mx-auto" width={28} height={28} /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-600 text-sm">Tidak ada log yang cocok.</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="tbl-row">
                  <td className="tbl-cell font-mono text-[11px] text-gray-500">{formatDateTime(log.created_at)}</td>
                  <td className="tbl-cell font-black text-white text-xs">{log.username || '-'}</td>
                  <td className="tbl-cell">
                    {log.role && <span className={`role-${log.role?.toLowerCase()}`}>{log.role?.replace('_',' ')}</span>}
                  </td>
                  <td className={`tbl-cell font-black text-xs ${ACTION_COLOR[log.action] || 'text-gray-400'}`}>
                    {log.action?.replace(/_/g,' ')}
                  </td>
                  <td className="tbl-cell text-gray-500 text-xs font-mono">{log.target_type || '-'} {log.target_id ? log.target_id.slice(0,8) : ''}</td>
                  <td className="tbl-cell font-mono text-[11px] text-gray-600">{log.ip_address}</td>
                  <td className="tbl-cell">
                    <span className={`${STATUS_COLOR[log.status] || 'badge'} text-[9px]`}>{log.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-ghost btn-sm disabled:opacity-30">← Prev</button>
          <span className="text-xs text-gray-500 font-mono">Hal {page} / {pagination.totalPages} ({pagination.total} entries)</span>
          <button onClick={() => setPage(p => Math.min(pagination.totalPages,p+1))} disabled={page===pagination.totalPages} className="btn-ghost btn-sm disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  );
}
