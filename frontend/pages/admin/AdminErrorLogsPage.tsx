import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { adminApi } from '../../apiClient';
import { DataTable } from '../../components/admin/DataTable';
import { useToast } from '../../context/ToastContext';

interface ErrorLogRow {
  id: number;
  user_id: number | null;
  user_email: string;
  error_message: string;
  error_stack: string;
  endpoint: string;
  status_code: number | null;
  details: string;
  ip_address: string;
  created_at: string;
}

export default function AdminErrorLogsPage() {
  const [logs, setLogs] = useState<ErrorLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { addToast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      const res = await adminApi.getErrorLogs(params);
      setLogs((res.data as any)?.logs ?? []);
      setTotal((res.data as any)?.total ?? 0);
    } catch {
      setLogs([]);
      addToast('error', 'Failed to load error logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const filtered = logs.filter(
    (log) =>
      !search ||
      log.error_message.toLowerCase().includes(search.toLowerCase()) ||
      log.user_email.toLowerCase().includes(search.toLowerCase()) ||
      log.endpoint.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (row: ErrorLogRow) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (row: ErrorLogRow) => (
        <div className="text-sm">
          <div className="font-medium text-slate-900 dark:text-white">{row.user_email || '—'}</div>
          <div className="text-xs text-slate-500">{row.ip_address || '—'}</div>
        </div>
      ),
    },
    {
      key: 'error',
      header: 'Error',
      render: (row: ErrorLogRow) => (
        <div className="text-sm flex-1">
          <div className="font-medium text-red-600 dark:text-red-400 line-clamp-1">
            {row.error_message}
          </div>
          <div className="text-xs text-slate-500 line-clamp-1">{row.endpoint}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: ErrorLogRow) => (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span className="text-sm font-mono text-red-600 dark:text-red-400">
            {row.status_code || '?'}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Error Logs</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Frontend error monitoring</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search errors, users, endpoints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(row) => row.id}
          loading={loading}
          emptyMessage="No error logs"
        />

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
