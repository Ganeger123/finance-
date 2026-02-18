import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  BarChart3,
  UserCircle,
  Settings,
  LogOut,
  ChevronRight,
  X
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

const SidebarContent: React.FC<SidebarProps & { onClose?: () => void }> = ({
  role,
  activePage,
  onNavigate,
  onLogout,
  onClose,
}) => {
  const { t } = useLanguage();

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'expenses', label: t('expenses'), icon: Receipt },
    { id: 'income', label: t('income'), icon: TrendingUp },
    { id: 'reports', label: t('reports'), icon: BarChart3 },
    { id: 'settings', label: t('settings'), icon: Settings },
  ];

  const handleNavigate = (id: string) => {
    onNavigate(id);
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full w-64 bg-gradient-to-b from-[#0f172a] via-[#111827] to-[#0f172a] text-white p-5 border-r border-white/5">
      {/* Brand */}
      <div className="flex items-center justify-between mb-8 px-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
            <LayoutDashboard className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex items-center gap-1">
            <h1 className="font-black text-lg tracking-tight text-white">FinTrack</h1>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </div>
        </div>
        {/* Close button — only shown on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group
                ${isActive
                  ? 'bg-indigo-500/20 text-white border border-indigo-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}
              `}
            >
              <Icon className={`w-4.5 h-4.5 flex-shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} style={{ width: '18px', height: '18px' }} />
              <span className={`text-sm font-medium flex-1 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-4 bg-indigo-400 rounded-full flex-shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin Section */}
      {(role === 'admin' || role === 'super_admin') && (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-1">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.18em] mb-3 px-3">
            Contrôle Admin
          </p>
          {[
            { id: 'admin-dashboard', label: 'Console Admin', icon: Settings },
            { id: 'users', label: 'Gest. Utilisateurs', icon: UserCircle },
          ].map(({ id, label, icon: Icon }) => {
            const isActive = activePage === id;
            return (
              <button
                key={id}
                onClick={() => handleNavigate(id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group
                  ${isActive
                    ? 'bg-indigo-500/20 text-white border border-indigo-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}
                `}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0 text-slate-500 group-hover:text-slate-300" style={{ width: '18px', height: '18px' }} />
                <span className="text-sm font-medium flex-1">{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Logout */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all group border border-transparent"
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0 group-hover:text-rose-400 transition-colors" style={{ width: '18px', height: '18px' }} />
          <span className="text-sm font-medium flex-1">Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = (props) => {
  const { isOpen = true, onClose } = props;

  return (
    <>
      {/* ── DESKTOP: part of normal flex flow, never fixed ── */}
      <aside className="hidden lg:flex lg:flex-shrink-0 h-screen sticky top-0">
        <SidebarContent {...props} onClose={undefined} />
      </aside>

      {/* ── MOBILE: fixed overlay ── */}
      <div className="lg:hidden">
        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={onClose}
          />
        )}
        {/* Drawer */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 h-full transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <SidebarContent {...props} onClose={onClose} />
        </aside>
      </div>
    </>
  );
};

export default Sidebar;
