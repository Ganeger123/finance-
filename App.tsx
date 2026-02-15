
import React, { useState, useEffect } from 'react';
import { User, Transaction } from './types';
import { INITIAL_TRANSACTIONS } from './mockData';
// LOGIN DISABLED - will be re-added later
// import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Income from './pages/Income';
import Search from './pages/Search';
import Settings from './pages/Settings';
import Sidebar from './components/Sidebar';
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
import { Workspace } from './types';

import { financeApi, authApi } from './apiClient';

// MOCK USER - LOGIN DISABLED FOR TESTING
const MOCK_USER: User = {
  id: '1',
  full_name: 'Test User',
  email: 'test@example.com',
  role: 'super_admin',
  status: 'approved'
};

const App: React.FC = () => {
  const [user, setUser] = useState<User>(MOCK_USER);
  const [sessionChecked, setSessionChecked] = useState(true);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | undefined>(undefined);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch transactions from API
  const fetchTransactions = async () => {
    if (!user) return;

    // Skip fetching if we're on a workspace-dependent page but no workspace is selected
    const workspacePages = ['custom-expenses', 'form-builder'];
    if (!selectedWorkspace && workspacePages.includes(currentPage)) {
      setTransactions([]);
      return;
    }

    setIsLoading(true);
    try {
      const params = selectedWorkspace ? { workspace_id: selectedWorkspace.id } : {};

      // Fetch expenses and income; tolerate 401/500 and use empty arrays
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

  // LOGIN DISABLED - Using mock user for testing
  // useEffect(() => {
  //   let cancelled = false;
  //   const restoreSession = async () => {
  //     // Session restoration disabled
  //   };
  //   restoreSession();
  //   return () => { cancelled = true; };
  // }, []);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, selectedWorkspace]);

  // No redirect: all users can see Tableau de Bord and Rentrées

  // Admin-only route guard: redirect non-admins away from admin pages
  const adminPages = ['admin-dashboard', 'admin-settings', 'admin-support'];
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
  useEffect(() => {
    if (user && adminPages.includes(currentPage) && !isAdmin) {
      setCurrentPage('dashboard');
    }
  }, [user, currentPage, isAdmin]);

  // LOGIN DISABLED - Always show app with mock user

  const handleAddTransaction = () => {
    fetchTransactions(); // Refresh data after adding
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard transactions={transactions} />;
      case 'expenses':
        return <Expenses transactions={transactions} onAdd={handleAddTransaction} selectedWorkspace={selectedWorkspace} role={user.role} />;
      case 'income':
      case 'rentrees':
        return <Income transactions={transactions} onAdd={handleAddTransaction} selectedWorkspace={selectedWorkspace} role={user.role} />;
      case 'search':
        return <Search transactions={transactions} />;
      case 'settings':
        return <Settings />;
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
        return selectedWorkspace ? <CustomExpenseEntry workspace={selectedWorkspace} role={user.role} onAdd={handleAddTransaction} /> : <WorkspaceManager onSelect={setSelectedWorkspace} />;
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


  // ... (rest of logic)

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans">
      <InstallPWA />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 z-30 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <span className="text-2xl">☰</span>
        </button>
        <span className="font-bold text-lg dark:text-white">Panacée</span>
        <div className="w-8"></div> {/* Spacer for balance */}
      </div>

      <Sidebar
        role={user.role}
        activePage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={() => {
          // LOGIN DISABLED - Logout not functional in test mode
          console.log('Logout called - login disabled for testing');
        }}
        userName={user.full_name || 'User'}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 transition-all duration-300 overflow-y-auto max-h-screen scroll-smooth pt-16 lg:pt-0 lg:ml-0">
        <div className="max-w-[1600px] mx-auto p-6 md:p-10 lg:p-14 pb-24 lg:pb-14">
          {renderPage()}
        </div>
      </main>
    </div>
  );
};

export default App;
