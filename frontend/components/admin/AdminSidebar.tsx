import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ScrollText,
  AlertTriangle,
  FileText,
  Headphones,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react';

const navItems: { path: string; label: string; icon: typeof LayoutDashboard }[] = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/activity', label: 'Activity Logs', icon: ScrollText },
  { path: '/admin/errors', label: 'Error Logs', icon: AlertTriangle },
  { path: '/admin/forms', label: 'Forms', icon: FileText },
  { path: '/admin/support', label: 'Support', icon: Headphones },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onLogout: () => void;
  userName?: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed, onLogout, userName }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const base = (path: string) => (path === '/admin' ? path : path + '/');
  const isActive = (path: string) =>
    path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path);

  const btn =
    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border border-transparent';
  const active = 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
  const inactive = 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white';

  return (
    <aside
      className={
        'fixed left-0 top-0 z-40 h-screen flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ' +
        (collapsed ? 'w-[72px]' : 'w-64')
      }
    >
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 dark:border-slate-800 px-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Shield className="h-5 w-5" />
        </div>
        {!collapsed && <span className="font-bold text-slate-900 dark:text-white truncate">Admin</span>}
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => (
          <button
            key={path}
            type="button"
            onClick={() => navigate(path)}
            className={btn + ' ' + (isActive(path) ? active : inactive) + ' w-full'}
            title={collapsed ? label : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>
      <div className="border-t border-slate-200 dark:border-slate-800 p-3">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 px-3 truncate">
          {!collapsed ? (userName ? `${userName}` : 'User') : userName ? userName[0] : 'U'}
        </div>
        <button
          type="button"
          onClick={onLogout}
          className={btn + ' w-full ' + inactive + ' text-red-600 dark:text-red-400 hover:bg-red-500/10'}
          title="Logout"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

