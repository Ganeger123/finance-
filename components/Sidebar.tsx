import React from 'react';
import { Role } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  role: Role;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  userName: string;
}

const Sidebar: React.FC<SidebarProps & { isOpen?: boolean; onClose?: () => void }> = ({ role, activePage, onNavigate, onLogout, userName, isOpen = true, onClose }) => {
  const { t } = useLanguage();

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: '📊', adminOnly: true },
    { id: 'expenses', label: t('expenses'), icon: '💸', adminOnly: false },
    { id: 'income', label: t('income'), icon: '💰', adminOnly: false },
    { id: 'workspaces', label: t('workspaces'), icon: '🏢', adminOnly: false },
    { id: 'custom-expenses', label: t('dynamic_expenses'), icon: '📝', adminOnly: false },
    { id: 'form-builder', label: t('form_builder'), icon: '🛠️', adminOnly: true },
    { id: 'search', label: t('search'), icon: '🔍', adminOnly: false },
    { id: 'users', label: t('user_management'), icon: '👥', adminOnly: true },
    { id: 'vendors', label: t('vendors'), icon: '🏪', adminOnly: false },
    { id: 'reports', label: t('reports'), icon: '📄', adminOnly: false },
    { id: 'dashboard', icon: '📊', label: t('dashboard') || 'Tableau de Bord', adminOnly: true },
    { id: 'custom-expenses', icon: '📈', label: t('rentrees') || 'Rentrées', adminOnly: false },
    { id: 'expenses', icon: '💸', label: t('expenses') || 'Dépenses', adminOnly: false },
    { id: 'vendors', icon: '👥', label: t('vendors') || 'Vendeurs', adminOnly: false },
    { id: 'reports', icon: '📄', label: t('reports') || 'Rapports', adminOnly: false },
  ];

  const supportItems = [
    { id: 'settings', icon: '⚙️', label: t('settings') || 'Paramètres', adminOnly: false },
    { id: 'help', icon: '❓', label: t('help') || 'Aide', adminOnly: false },
  ];

  const handleNavigate = (id: string) => {
    onNavigate(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity" onClick={onClose} />}

      <div className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#131b2e] text-white flex flex-col p-6 border-r border-slate-800/50
        transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Logo */}
        <div className="flex items-center justify-between mb-10 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/20">
              F
            </div>
            <div>
              <h1 className="font-black text-lg leading-tight tracking-tight">FinCore</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestion Financière</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Navigation */}
        <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-2">Principal</p>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                if (item.adminOnly && role !== 'ADMIN') return null;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${isActive
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                  >
                    <span className="text-lg opacity-80">{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Support Section */}
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-2">Support</p>
            <nav className="space-y-1">
              {supportItems.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${isActive
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                  >
                    <span className="text-lg opacity-80">{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User / Bottom */}
        <div className="mt-auto pt-6 border-t border-slate-800/50">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 bg-slate-800 dark:bg-slate-900 rounded-xl flex items-center justify-center font-black text-xs text-slate-400">
              {userName?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{userName || 'Admin'}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{role || 'Directeur'}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-100 bg-red-500/10 hover:bg-red-500/20 transition-all duration-200 border border-red-500/20"
          >
            <span className="text-lg">🚪</span>
            {t('logout') || 'Déconnexion'}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
