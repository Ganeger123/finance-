import React, { useEffect, useState } from 'react';
import { Users, Activity, FileText, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { adminApi } from '../../apiClient';
import { StatCard } from '../../components/admin/StatCard';
import { StatCardSkeleton } from '../../components/admin/Skeleton';
import { ActivityFeed, type ActivityItem } from '../../components/admin/ActivityFeed';

interface DashboardStats {
  totalUsers: number;
  activeSessions: number;
  formsToday: number;
  securityAlerts: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<{ date: string; logins: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [usersRes, activityRes, formLogsRes] = await Promise.all([
          adminApi.getUsers().catch(() => ({ data: [] })),
          adminApi.getActivityLogs({ page: 1, page_size: 100 }).catch(() => ({ data: { logs: [] } })),
          adminApi.getFormLogs({ page: 1, page_size: 500 }).catch(() => ({ data: { logs: [] } })),
        ]);
        if (cancelled) return;

        const users = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data as any)?.users ?? [];
        const logs = (activityRes.data as any)?.logs ?? [];
        const formLogs = (formLogsRes.data as any)?.logs ?? [];

        const today = new Date().toISOString().slice(0, 10);
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().slice(0, 10);
        });
        const loginsByDay: Record<string, number> = {};
        last7Days.forEach((d) => (loginsByDay[d] = 0));
        logs.forEach((l: any) => {
          if (l.action === 'LOGIN' && l.created_at) {
            const day = l.created_at.slice(0, 10);
            if (day in loginsByDay) loginsByDay[day]++;
          }
        });
        setChartData(
          last7Days.map((date) => ({
            date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            logins: loginsByDay[date] ?? 0,
          }))
        );

        const formsTodayCount = formLogs.filter(
          (f: any) => (f.submitted_at || f.created_at || '').toString().slice(0, 10) === today
        ).length;
        const securityAlertsCount = logs.filter(
          (l: any) => l.action === 'LOGIN_FAILED' && l.created_at && l.created_at.slice(0, 10) === today
        ).length;
        const activeSessionsEst = logs.filter(
          (l: any) => l.action === 'LOGIN' && l.created_at && l.created_at.slice(0, 10) === today
        ).length;

        setStats({
          totalUsers: users.length,
          activeSessions: activeSessionsEst,
          formsToday: formsTodayCount,
          securityAlerts: securityAlertsCount,
        });

        setRecentActivity(
          (logs as any[]).slice(0, 15).map((l) => ({
            id: l.id,
            user: l.user_email || l.user_name || '—',
            action: l.action,
            ip_address: l.ip_address,
            device: l.device,
            status: l.status,
            created_at: l.created_at,
          }))
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Overview of your financial management system
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : stats ? (
          <>
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon={Users}
              accent="indigo"
            />
            <StatCard
              title="Active Sessions (today)"
              value={stats.activeSessions}
              icon={Activity}
              accent="emerald"
            />
            <StatCard
              title="Forms Submitted Today"
              value={stats.formsToday}
              icon={FileText}
              accent="zinc"
            />
            <StatCard
              title="Security Alerts"
              value={stats.securityAlerts}
              icon={AlertTriangle}
              accent={stats.securityAlerts > 0 ? 'red' : 'zinc'}
            />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Logins over time</h2>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="fillLogins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-slate-500" />
                  <YAxis tick={{ fontSize: 12 }} className="text-slate-500" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                    }}
                  />
                  <Area type="monotone" dataKey="logins" stroke="#6366f1" strokeWidth={2} fill="url(#fillLogins)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">No data yet</div>
            )}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recent Activity</h2>
          <ActivityFeed items={recentActivity} loading={loading} maxHeight="320px" />
        </div>
      </div>

      {stats && stats.securityAlerts > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 dark:bg-red-500/20 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {stats.securityAlerts} failed login attempt(s) today. Review Activity Logs for details.
          </p>
        </div>
      )}
    </div>
  );
}
