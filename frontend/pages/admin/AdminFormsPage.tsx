import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { adminApi } from '../../apiClient';
import { useToast } from '../../context/ToastContext';
import { Skeleton } from '../../components/admin/Skeleton';

interface FormLogRow {
  id: number;
  user_email: string;
  form_name: string;
  data_summary: string;
  submitted_at: string;
}

export default function AdminFormsPage() {
  const [logs, setLogs] = useState<FormLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    setLoading(true);
    adminApi.getFormLogs({ page, page_size: pageSize }).then((res) => {
      const d = (res.data as any) || {};
      setLogs(d.logs || []);
      setTotal(d.total || 0);
    }).catch(() => addToast('error', 'Failed to load form submissions')).finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Forms Monitoring</h1>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No form submissions yet.</div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {logs.map((log) => (
              <div key={log.id}>
                <button type="button" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)} className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  {expandedId === log.id ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                  <span className="font-medium text-slate-900 dark:text-white">{log.form_name}</span>
                  <span className="text-sm text-slate-500">{log.user_email}</span>
                  <span className="text-xs text-slate-400 ml-auto">{log.submitted_at ? new Date(log.submitted_at).toLocaleString() : '-'}</span>
                </button>
                {expandedId === log.id && (
                  <div className="px-4 pb-4 pl-12"><pre className="text-xs bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 overflow-x-auto">{log.data_summary || 'No data'}</pre></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-between">
        <p className="text-sm text-slate-500">Total: {total} - Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-xl border text-sm disabled:opacity-50">Previous</button>
          <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-xl border text-sm disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
