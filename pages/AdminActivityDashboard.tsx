import React, { useState, useEffect } from 'react';
import { adminApi } from '../apiClient';
import { useTheme } from '../context/ThemeContext';

interface ActivityLogRecord {
  id: number;
  user_id: number | null;
  user_email: string;
  user_name: string;
  action: string;
  ip_address: string;
  device: string;
  status: string;
  details: string;
  created_at: string;
}

export default function AdminActivityDashboard() {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (filterAction) params.action = filterAction;
      if (filterStatus) params.status = filterStatus;
      const res = await adminApi.getActivityLogs(params);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string };
      setError(err.response?.data?.detail || err.message || 'Failed to load logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filterAction, filterStatus]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await adminApi.exportActivityLogs('csv');
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'activity_logs.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;
  const isDark = theme === 'dark';

  return (
    <div className={`rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'} shadow-sm p-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">User Activity Logs</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
          >
            <option value="">All actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="PASSWORD_RESET">PASSWORD_RESET</option>
            <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
            <option value="FORM_SUBMITTED">FORM_SUBMITTED</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
          >
            <option value="">All statuses</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
          </select>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12 text-slate-500">Loading…</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                  <th className="text-left py-3 px-2 font-bold">ID</th>
                  <th className="text-left py-3 px-2 font-bold">User ID</th>
                  <th className="text-left py-3 px-2 font-bold">Name / Email</th>
                  <th className="text-left py-3 px-2 font-bold">Action</th>
                  <th className="text-left py-3 px-2 font-bold">IP</th>
                  <th className="text-left py-3 px-2 font-bold">Device</th>
                  <th className="text-left py-3 px-2 font-bold">Status</th>
                  <th className="text-left py-3 px-2 font-bold">Time</th>
                </tr>
              </thead>
              <tbody className={`${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {logs.map((log) => (
                  <tr key={log.id} className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                    <td className="py-2 px-2">{log.id}</td>
                    <td className="py-2 px-2">{log.user_id ?? '—'}</td>
                    <td className="py-2 px-2">
                      <span className="font-medium">{log.user_name || '—'}</span>
                      <br />
                      <span className="text-slate-500 dark:text-slate-400 text-xs">{log.user_email || '—'}</span>
                    </td>
                    <td className="py-2 px-2 font-mono">{log.action}</td>
                    <td className="py-2 px-2">{log.ip_address || '—'}</td>
                    <td className="py-2 px-2 max-w-[200px] truncate" title={log.device}>{log.device || '—'}</td>
                    <td className="py-2 px-2">
                      <span className={log.status === 'Success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-xs">{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Total: {total} · Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-50 font-medium"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-50 font-medium"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
