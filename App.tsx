
import React, { useState, useEffect } from 'react';
import { User, Transaction, Workspace } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Income from './pages/Income';
import Search from './pages/Search';
import Settings from './pages/Settings';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Modal from './components/Modal';
import TransactionForm from './components/TransactionForm';
import WorkspaceManager from './pages/WorkspaceManager';
import FormBuilder from './pages/FormBuilder';
import CustomExpenseEntry from './pages/CustomExpenseEntry';
import UserManagement from './pages/UserManagement';
import Vendors from './pages/Vendors';
import Reports from './pages/Reports';
import AdminActivityDashboard from './pages/AdminActivityDashboard';
import AdminSettings from './pages/AdminSettings';
import AdminSupport from './pages/AdminSupport';
import Notifications from './pages/Notifications';
import Help from './pages/Help';
import InstallPWA from './components/InstallPWA';
import FinBot from './components/FinBot';

import { financeApi, authApi } from './apiClient';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | undefined>(undefined);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modal states
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);

  // PWA Service Worker Registration & Notification Permission
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
          console.log('SW registered:', registration);
        }).catch((error) => {
          console.log('SW registration failed:', error);
        });
      });
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const triggerNotification = (title: string, body: string) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        payload: { title, body }
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/pwa_icon_512.png' });
    }
  };

  // Fetch transactions from API
  const fetchTransactions = async () => {
    if (!user) return;
    const workspacePages = ['custom-expenses', 'form-builder'];
    if (!selectedWorkspace && workspacePages.includes(currentPage)) {
      setTransactions([]);
      return;
    }

    setIsLoading(true);
    try {
      const params = selectedWorkspace ? { workspace_id: selectedWorkspace.id } : {};
      let expensesData: any[] = [];
      let incomeData: any[] = [];
      let formsData: any[] = [];

      try {
        const expensesRes = await financeApi.getExpenses(params);
        expensesData = Array.isArray(expensesRes?.data) ? expensesRes.data : [];
      } catch (e) {
        console.warn("Failed to fetch expenses", e);
      }
      try {
        const incomeRes = await financeApi.getIncomes(params);
        incomeData = Array.isArray(incomeRes?.data) ? incomeRes.data : [];
      } catch (e) {
        console.warn("Failed to fetch income", e);
      }
      if (selectedWorkspace) {
        try {
          const formsRes = await financeApi.getForms(selectedWorkspace.id);
          formsData = Array.isArray(formsRes?.data) ? formsRes.data : [];
        } catch (e) {
          console.warn("Failed to fetch forms", e);
        }
      }

      let mappedCustomExpenses: any[] = [];
      if (formsData.length > 0) {
        try {
          const entryPromises = formsData.map((f: any) => financeApi.getEntries(f.id));
          const entriesResponses = await Promise.allSettled(entryPromises);
          entriesResponses.forEach((result, index) => {
            if (result.status !== 'fulfilled' || !result.value?.data) return;
            const form = formsData[index];
            if (!form?.fields) return;
            const amountFields = form.fields.filter((f: any) =>
              ['montant', 'amount', 'prix', 'total'].includes((f.label || '').toLowerCase())
            );
            (result.value.data as any[]).forEach((entry: any) => {
              let amount = 0;
              for (const f of amountFields) {
                const val = entry.data?.[f.id];
                if (val != null) {
                  amount = parseFloat(val) || 0;
                  break;
                }
              }
              mappedCustomExpenses.push({
                id: `entry-${entry.id}`,
                date: (entry.created_at || '').split('T')[0],
                type: 'EXPENSE',
                category: form.name,
                amount: amount,
                comment: entry.data ? Object.entries(entry.data).map(([k, v]) => `${k}: ${v}`).join(', ') : ''
              });
            });
          });
        } catch (err) {
          console.warn("Failed to fetch custom entries", err);
        }
      }

      const mappedExpenses = expensesData.map((ex: any) => ({
        id: String(ex.id),
        date: (ex.date || '').split('T')[0] || ex.date,
        type: 'EXPENSE',
        category: ex.category || 'AUTRE',
        amount: Number(ex.amount) || 0,
        comment: ex.comment || ''
      }));

      const mappedIncomes = incomeData.map((inc: any) => ({
        id: String(inc.id),
        date: (inc.date || '').split('T')[0] || inc.date,
        type: 'INCOME',
        category: inc.type || 'FORMATION',
        subType: inc.subtype || '',
        amount: Number(inc.amount) || 0,
        studentCount: Number(inc.student_count) || 0,
        comment: (inc.student_count > 0 ? `${inc.student_count} étudiants` : '') || inc.comment || ''
      }));

      const allTransactions = [...mappedExpenses, ...mappedIncomes, ...mappedCustomExpenses];
      setTransactions(allTransactions.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    } catch (error) {
      console.error("Failed to fetch transactions", error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const decodeToken = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const decoded = decodeToken(token);
          if (decoded && decoded.exp * 1000 > Date.now()) {
            const response = await authApi.getMe();
            if (response.data) {
              const u = response.data;
              setUser({
                id: String(u.id),
                full_name: u.full_name || u.email.split('@')[0],
                email: u.email,
                role: u.role || 'user',
                status: u.status || 'pending',
                photo_url: u.photo_url
              });
            }
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
          }
        }
      } catch (e) {
        console.error("Session restoration failed", e);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      } finally {
        setSessionChecked(true);
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, selectedWorkspace]);

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
  useEffect(() => {
    const adminPages = ['admin-dashboard', 'admin-settings', 'admin-support'];
    if (user && adminPages.includes(currentPage) && !isAdmin) {
      setCurrentPage('dashboard');
    }
  }, [user, currentPage, isAdmin]);

  const handleAddTransaction = (type: 'EXPENSE' | 'INCOME') => {
    fetchTransactions();
    setShowAddExpense(false);
    setShowAddIncome(false);

    const title = type === 'EXPENSE' ? 'Dépense enregistrée' : 'Revenu enregistré';
    const body = type === 'EXPENSE'
      ? 'Votre nouvelle dépense a été ajoutée avec succès.'
      : 'Votre nouveau revenu a été ajouté avec succès.';
    triggerNotification(title, body);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn("Logout API call failed", e);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const renderPage = () => {
    if (!user) return null;
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard transactions={transactions} />;
      case 'expenses':
        return <Expenses transactions={transactions} onAdd={fetchTransactions} selectedWorkspace={selectedWorkspace} role={user.role} />;
      case 'income':
      case 'rentrees':
        return <Income transactions={transactions} onAdd={fetchTransactions} selectedWorkspace={selectedWorkspace} role={user.role} />;
      case 'search':
        return <Search transactions={transactions} />;
      case 'settings':
        return <Settings user={user} />;
      case 'workspaces':
        return <WorkspaceManager onSelect={setSelectedWorkspace} selectedWorkspace={selectedWorkspace} />;
      case 'form-builder':
        return selectedWorkspace ? <FormBuilder workspace={selectedWorkspace} onFormCreated={() => setCurrentPage('custom-expenses')} /> : <WorkspaceManager onSelect={setSelectedWorkspace} />;
      case 'users':
        return <UserManagement />;
      case 'vendors':
        return <Vendors user={user} />;
      case 'reports':
        return <Reports user={user} />;
      case 'custom-expenses':
        return selectedWorkspace ? <CustomExpenseEntry workspace={selectedWorkspace} role={user.role} onAdd={fetchTransactions} /> : <WorkspaceManager onSelect={setSelectedWorkspace} />;
      case 'admin-dashboard':
        return <AdminActivityDashboard />;
      case 'admin-settings':
        return <AdminSettings />;
      case 'admin-support':
        return <AdminSupport />;
      case 'notifications':
        return <Notifications />;
      case 'help':
        return <Help />;
      default:
        return <Dashboard transactions={transactions} />;
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-[var(--bg-layout)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-layout)] text-slate-900 transition-colors duration-300 font-sans">
      <InstallPWA />

      <Sidebar
        role={user.role}
        activePage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
        userName={user.full_name || 'User'}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 transition-all duration-300 overflow-y-auto max-h-screen scroll-smooth">
        {/* Mobile Navbar */}
        <div className="lg:hidden sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-30 px-6 py-4 flex items-center justify-between">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600">
            <span className="text-2xl">☰</span>
          </button>
          <span className="font-black text-xl tracking-tight text-[#374b91]">FinTrack</span>
          <div className="w-8"></div>
        </div>

        <div className="max-w-[1400px] mx-auto p-6 lg:p-10">
          <Header
            user={user}
            onAddExpense={() => setShowAddExpense(true)}
            onAddIncome={() => setShowAddIncome(true)}
          />

          <div className="pb-20">
            {renderPage()}
          </div>
        </div>
      </main>

      {/* Global Modals */}
      <Modal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        title="Add New Expense"
      >
        <TransactionForm
          type="EXPENSE"
          onSuccess={() => handleAddTransaction('EXPENSE')}
          selectedWorkspace={selectedWorkspace}
        />
      </Modal>

      <Modal
        isOpen={showAddIncome}
        onClose={() => setShowAddIncome(false)}
        title="Record New Income"
      >
        <TransactionForm
          type="INCOME"
          onSuccess={() => handleAddTransaction('INCOME')}
          selectedWorkspace={selectedWorkspace}
        />
      </Modal>

      {user && <FinBot />}
    </div>
  );
};

export default App;
