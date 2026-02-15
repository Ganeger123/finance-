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
    {
      id: 'dashboard',
      label: 'Tableau de Bord',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      adminOnly: false
    },
    {
      id: 'rentrees',
      label: 'Rentrées',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      adminOnly: false
    },
    {
      id: 'expenses',
      label: 'Dépenses',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
        </svg>
      ),
      adminOnly: false
    },
    {
      id: 'vendors',
      label: 'Vendeurs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      adminOnly: false
    },
    {
      id: 'reports',
      label: 'Rapports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      adminOnly: false
    },
    {
      id: 'workspaces',
      label: 'Espaces',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      adminOnly: false
    },
  ];

  const supportItems = [
    {
      id: 'notifications',
      label: 'Notifications',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      adminOnly: false
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      adminOnly: false
    },
    {
      id: 'help',
      label: 'Aide',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      adminOnly: false
    },
  ];

  const adminMenuItems = [
    { id: 'admin-dashboard', label: 'Activity Logs', adminOnly: true, href: null },
    { id: 'admin-settings', label: 'Admin Settings', adminOnly: true, href: null },
    { id: 'admin-support', label: 'Support Tickets', adminOnly: true, href: null },
    { id: 'admin-new', label: 'Admin Dashboard (new)', adminOnly: true, href: '/admin' },
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
            <div className="w-10 h-10 flex items-center justify-center font-black text-xl">
              <img src="/logo-panacee.png" alt="Logo" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <h1 className="font-black text-lg leading-tight tracking-tight text-white">Panacée</h1>
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
        <div className="space-y-8 flex-1 overflow-y-auto no-scrollbar">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-2 italic">PRINCIPAL</p>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                if (item.adminOnly && role !== 'admin' && role !== 'super_admin') return null;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${isActive
                      ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                  >
                    <span className={`${isActive ? 'opacity-100' : 'opacity-60'}`}>{item.icon}</span>
                    <span className="tracking-tight">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Admin Section (only for admin / super_admin) */}
          {(role === 'admin' || role === 'super_admin') && (
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-2 italic">ADMIN</p>
              <nav className="space-y-1">
                {adminMenuItems.map((item) => {
                  const isActive = activePage === item.id;
                  const href = (item as { href?: string }).href;
                  if (href) {
                    return (
                      <a
                        key={item.id}
                        href={href}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/50"
                      >
                        <span className="opacity-60">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </span>
                        <span className="tracking-tight">{item.label}</span>
                      </a>
                    );
                  }
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${isActive
                        ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    >
                      <span className={isActive ? 'opacity-100' : 'opacity-60'}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </span>
                      <span className="tracking-tight">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Support Section */}
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-2 italic">SUPPORT</p>
            <nav className="space-y-1">
              {supportItems.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${isActive
                      ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                  >
                    <span className={`${isActive ? 'opacity-100' : 'opacity-60'}`}>{item.icon}</span>
                    <span className="tracking-tight">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User / Bottom */}
        <div className="mt-auto pt-6 border-t border-slate-800/50">
          <div className="flex items-center gap-3 px-2 mb-0">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-lg shadow-emerald-500/20">
              {userName?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm truncate uppercase tracking-tight">{userName || 'Admin'}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black italic">{(role === 'admin' || role === 'super_admin') ? 'Directeur' : 'Staff'}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
