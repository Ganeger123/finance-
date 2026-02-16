import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  BarChart3,
  UserCircle,
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { Role } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  role: Role;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  userName: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  role,
  activePage,
  onNavigate,
  onLogout,
  userName,
  isOpen = true,
  onClose
}) => {
  const { t } = useLanguage();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'income', label: 'Income', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavigate = (id: string) => {
    onNavigate(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 w-64 sidebar-gradient text-white flex flex-col p-6
        transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Logo */}
        <div className="flex items-center gap-3 mb-10 px-2 group">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
            <LayoutDashboard className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex items-center gap-1">
            <h1 className="font-black text-xl tracking-tight">FinTrack</h1>
            <ChevronRight className="w-4 h-4 text-slate-400/50 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive
                    ? 'bg-white/10 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'}
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold tracking-tight ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="ml-auto w-1 h-4 bg-emerald-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Admin Section */}
        {(role === 'admin' || role === 'super_admin') && (
          <div className="mt-6 pt-6 border-t border-white/5 space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-4">Admin Control</p>
            <button
              onClick={() => handleNavigate('admin-dashboard')}
              className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${activePage === 'admin-dashboard' ? 'bg-indigo-500/20 text-white border border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                `}
            >
              <Settings className={`w-5 h-5 ${activePage === 'admin-dashboard' ? 'text-indigo-400' : ''}`} />
              <span className="text-sm font-semibold">Admin Console</span>
            </button>
            <button
              onClick={() => handleNavigate('users')}
              className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${activePage === 'users' ? 'bg-indigo-500/20 text-white border border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                `}
            >
              <UserCircle className={`w-5 h-5 ${activePage === 'users' ? 'text-indigo-400' : ''}`} />
              <span className="text-sm font-semibold">User Mgt</span>
            </button>
          </div>
        )}

        {/* Footer / Logout */}
        <div className="mt-auto pt-6 border-t border-white/5">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-rose-500/20 transition-colors">
              <LogOut className="w-4 h-4 group-hover:text-rose-400 transition-colors" />
            </div>
            <span className="text-sm font-bold tracking-tight">Sign Out</span>
            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
