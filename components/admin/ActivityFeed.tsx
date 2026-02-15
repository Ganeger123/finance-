import React from 'react';
import { StatusBadge } from './StatusBadge';

export interface ActivityItem {
  id: string | number;
  user?: string;
  action: string;
  ip_address?: string;
  device?: string;
  status: string;
  created_at: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  loading?: boolean;
  maxHeight?: string;
}

const actionColors: Record<string, 'success' | 'error' | 'warning' | 'info' | 'neutral'> = {
  LOGIN: 'success',
  LOGOUT: 'neutral',
  LOGIN_FAILED: 'error',
  PASSWORD_CHANGED: 'info',
  PASSWORD_RESET: 'info',
  FORM_SUBMITTED: 'success',
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  items,
  loading,
  maxHeight = '400px',
}) => {
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diff = (now.getTime() - d.getTime()) / 60000;
      if (diff < 1) return 'Just now';
      if (diff < 60) return `${Math.floor(diff)}m ago`;
      if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
      return d.toLocaleDateString();
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="h-3 w-1/4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden"
      style={{ maxHeight }}
    >
      <div className="overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700">
        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">No recent activity</div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div
                className={
                  'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ' +
                  (item.status === 'Success'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/15 text-red-600 dark:text-red-400')
                }
              >
                {item.action === 'LOGIN' ? 'L' : item.action === 'LOGOUT' ? 'O' : '•'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900 dark:text-white">{item.action}</span>
                  <StatusBadge
                    label={item.status}
                    variant={item.status === 'Success' ? 'success' : 'error'}
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {item.user || '—'} · {item.ip_address || '—'} · {formatTime(item.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
