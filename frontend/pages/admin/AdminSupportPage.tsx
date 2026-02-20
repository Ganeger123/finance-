import React, { useState, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { adminApi } from '../../apiClient';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { Skeleton } from '../../components/admin/Skeleton';

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

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params: Record<string, number | string> = { page, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;
      const res = await adminApi.getSupportTickets(params);
      const data = res.data as any;
      setTickets(data?.tickets ?? []);
      setTotal(data?.total ?? 0);
      if (selectedId === null && data?.tickets?.length) setSelectedId(data.tickets[0].id);
    } catch {
      setTickets([]);
      addToast('error', 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter]);

  const selected = tickets.find((t) => t.id === selectedId);

  const handleRespond = async () => {
    if (!selectedId || !replyText.trim()) return;
    setSending(true);
    try {
      await adminApi.respondSupportTicket(selectedId, { admin_reply: replyText.trim(), status: 'closed' });
      setReplyText('');
      addToast('success', 'Reply sent and ticket closed');
      fetchTickets();
    } catch {
      addToast('error', 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Support</h1>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm w-40"
        >
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden min-h-[480px]">
        <div className="lg:col-span-1 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">No tickets.</div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={
                  'w-full text-left p-4 border-b border-slate-100 dark:border-slate-700/50 transition-colors ' +
                  (selectedId === t.id ? 'bg-indigo-500/10 border-l-4 border-l-indigo-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50')
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900 dark:text-white truncate">#{t.id} - {t.user_email}</span>
                  <StatusBadge label={t.status} variant={t.status === 'open' ? 'warning' : 'neutral'} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{t.message}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {t.created_at ? new Date(t.created_at).toLocaleString() : ''}
                </p>
              </button>
            ))
          )}
        </div>
        <div className="lg:col-span-2 flex flex-col">
          {selected ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selected.user_email} - {new Date(selected.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selected.message}</p>
                  </div>
                </div>
                {selected.admin_reply && (
                  <div className="flex items-start gap-3 pl-8 border-l-2 border-indigo-500/30">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-semibold">Reply:</span> {selected.admin_reply}
                    </p>
                    {selected.replied_at && (
                      <span className="text-xs text-slate-400">{new Date(selected.replied_at).toLocaleString()}</span>
                    )}
                  </div>
                )}
              </div>
              {selected.status === 'open' && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply"
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleRespond}
                    disabled={sending || !replyText.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? 'Sending' : 'Reply and close'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">
              Select a ticket
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">Total: {total} - Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
