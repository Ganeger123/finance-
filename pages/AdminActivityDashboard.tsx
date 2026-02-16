import React, { useState, useEffect } from 'react';
import { adminApi } from '../apiClient';
import { useTheme } from '../context/ThemeContext';
import {
  Users,
  Activity,
  DollarSign,
  ShieldAlert,
  Clock,
  Download,
  Filter,
  RefreshCcw,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

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

interface SystemStats {
  active_sessions_24h: number;
  total_users: number;
  pending_approvals: number;
  total_volume: number;
  recent_activities: any[];
}

export default function AdminActivityDashboard() {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const statsRes = await adminApi.getSystemStats();
      setStats(statsRes.data);

      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (filterAction) params.action = filterAction;
      if (filterStatus) params.status = filterStatus;
      const res = await adminApi.getActivityLogs(params);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (e: unknown) {
      const err = e as any;
      setError(err.response?.data?.detail || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [page, filterAction, filterStatus]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await adminApi.exportActivityLogs('csv');
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fintrack_audit_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;
  const isDark = theme === 'dark';

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className={`fintrack-card p-6 border-l-4 ${color}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl bg-white shadow-sm border border-slate-100`}>
          <Icon className="w-6 h-6 text-slate-700" />
        </div>
        {trend && (
          <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h4 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h4>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-[0.2em] mb-3 border border-rose-100">
            System Monitoring
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Admin Console</h2>
          <p className="text-slate-500 font-medium mt-1">Real-time system health and security auditing.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAll}
            className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-6 py-4 bg-[#374b91] text-white font-black rounded-2xl flex items-center gap-2 hover:bg-[#202a54] transition-all active:scale-95 shadow-xl shadow-indigo-100 uppercase tracking-widest text-xs disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            <span>{exporting ? 'Exporting...' : 'Export Audit Log'}</span>
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Sessions"
          value={stats?.active_sessions_24h || 0}
          icon={Clock}
          color="border-l-indigo-500"
          trend="Live"
        />
        <StatCard
          title="Total Users"
          value={stats?.total_users || 0}
          icon={Users}
          color="border-l-emerald-500"
        />
        <StatCard
          title="Pending Approvals"
          value={stats?.pending_approvals || 0}
          icon={ShieldAlert}
          color="border-l-amber-500"
        />
        <StatCard
          title="Total Volume"
          value={`$${(stats?.total_volume || 0).toLocaleString()}`}
          icon={DollarSign}
          color="border-l-blue-500"
        />
      </div>

      <div className="fintrack-card overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">System Audit Trail</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={filterAction}
                onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                className="pl-11 pr-5 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-xs text-slate-600 appearance-none focus:ring-4 focus:ring-slate-100 transition-all"
              >
                <option value="">All Actions</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="CREATE_EXPENSE">CREATE_EXPENSE</option>
                <option value="FORM_SUBMITTED">FORM_SUBMITTED</option>
                <option value="LOGIN_FAILED">SECURITY_ALERT</option>
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search logs..."
                className="pl-11 pr-5 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-xs text-slate-600 focus:ring-4 focus:ring-slate-100 transition-all w-40"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="m-8 p-4 bg-rose-50 text-rose-600 text-xs font-bold rounded-2xl border border-rose-100">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Event</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Source IP</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Device</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-sm tracking-tight">{log.action}</span>
                      <span className="text-[10px] text-slate-400 mt-1 truncate max-w-[150px]">{log.details}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                        {log.user_name?.[0] || 'U'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{log.user_name || 'System'}</span>
                        <span className="text-[10px] text-slate-400">{log.user_email || '-'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${log.status === 'Success'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm font-mono text-slate-500">{log.ip_address || '0.0.0.0'}</td>
                  <td className="px-8 py-6 text-xs text-slate-400 truncate max-w-[120px]" title={log.device}>{log.device || '-'}</td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-slate-600">{new Date(log.created_at).toLocaleDateString()}</span>
                      <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <p className="text-slate-300 font-bold italic">No events recorded in this period.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Showing Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
