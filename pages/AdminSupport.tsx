import React, { useState, useEffect } from 'react';
import { adminApi } from '../apiClient';
import { useTheme } from '../context/ThemeContext';

interface Ticket {
  id: number;
  user_id: number;
  user_email: string;
  message: string;
  status: string;
  admin_reply: string;
  replied_at: string | null;
  created_at: string;
}

export default function AdminSupport() {
  const { theme } = useTheme();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;
      const res = await adminApi.getSupportTickets(params);
      setTickets(res.data.tickets || []);
      setTotal(res.data.total || 0);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load tickets');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter]);

  const handleRespond = async (ticketId: number) => {
    if (!replyText.trim()) return;
    setReplyingId(ticketId);
    try {
      await adminApi.respondSupportTicket(ticketId, { admin_reply: replyText.trim(), status: 'closed' });
      setReplyText('');
      setReplyingId(null);
      fetchTickets();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to send reply');
    } finally {
      setReplyingId(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;
  const isDark = theme === 'dark';

  return (
    <div className={`rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'} shadow-sm p-6`}>
      <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Support Tickets</h1>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className={`rounded-xl border px-3 py-2 text-sm font-medium ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
        >
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-slate-500">Loading…</div>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    #{t.id} · {t.user_email} · {new Date(t.created_at).toLocaleString()}
                  </span>
                  <p className={`mt-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{t.message}</p>
                  {t.admin_reply && (
                    <div className={`mt-3 pl-3 border-l-2 ${isDark ? 'border-emerald-600 text-slate-300' : 'border-emerald-400 text-slate-600'}`}>
                      <span className="text-xs font-bold">Reply:</span> {t.admin_reply}
                      {t.replied_at && (
                        <span className="text-xs opacity-75 ml-2">{new Date(t.replied_at).toLocaleString()}</span>
                      )}
                    </div>
                  )}
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${t.status === 'open' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {t.status}
                </span>
              </div>
              {t.status === 'open' && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={replyingId === t.id ? replyText : ''}
                    onChange={(e) => { setReplyingId(t.id); setReplyText(e.target.value); }}
                    placeholder="Reply to ticket…"
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
                  />
                  <button
                    onClick={() => handleRespond(t.id)}
                    disabled={replyingId === t.id && !replyText.trim()}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Send & close
                  </button>
                </div>
              )}
            </div>
          ))}
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
        </div>
      )}
    </div>
  );
}
