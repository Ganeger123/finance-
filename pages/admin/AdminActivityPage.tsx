import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { adminApi } from '../../apiClient';
import { DataTable } from '../../components/admin/DataTable';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { useToast } from '../../context/ToastContext';

interface LogRow {
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

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filterAction, setFilterAction] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const { addToast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (filterAction) params.action = filterAction;
      if (filterStatus) params.status = filterStatus;
      const res = await adminApi.getActivityLogs(params);
      setLogs((res.data as any)?.logs ?? []);
      setTotal((res.data as any)?.total ?? 0);
    } catch {
      setLogs([]);
      addToast('error', 'Failed to load activity logs');
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
      addToast('success', 'Export downloaded');
    } catch {
      addToast('error', 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns = [
    {
      key: 'id',
      header: 'ID',
      render: (row: LogRow) => <span className="text-slate-500 font-mono text-xs">{row.id}</span>,
    },
    {
      key: 'user',
      header: 'User',
      render: (row: LogRow) => (
        <div>
          <span className="font-medium text-slate-900 dark:text-white">{row.user_name || '—'}</span>
          <br />
          <span className="text-xs text-slate-500 dark:text-slate-400">{row.user_email || '—'}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (row: LogRow) => (
        <StatusBadge
          label={row.action}
          variant={
            row.action === 'LOGIN_FAILED' ? 'error' : row.action === 'FORM_SUBMITTED' ? 'success' : 'info'
          }
        />
      ),
    },
    {
      key: 'ip_address',
      header: 'IP',
      render: (row: LogRow) => <span className="font-mono text-xs">{row.ip_address || '—'}</span>,
    },
    {
      key: 'device',
      header: 'Device',
      render: (row: LogRow) => (
        <span className="max-w-[180px] truncate block text-xs" title={row.device}>
          {row.device || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: LogRow) => (
        <StatusBadge label={row.status} variant={row.status === 'Success' ? 'success' : 'error'} />
      ),
    },
    {
      key: 'created_at',
      header: 'Time',
      render: (row: LogRow) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Activity Logs</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm"
          >
            <option value="">All actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
            <option value="PASSWORD_RESET">PASSWORD_RESET</option>
            <option value="FORM_SUBMITTED">FORM_SUBMITTED</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
          </select>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="No activity logs"
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Total: {total} · Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
