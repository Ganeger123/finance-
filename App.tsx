
import React, { useState, useEffect } from 'react';
import { User, Transaction } from './types';
import { INITIAL_TRANSACTIONS } from './mockData';
import Login from './pages/Login';
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
import InstallPWA from './components/InstallPWA';
import { Workspace } from './types';

import { financeApi, authApi } from './api';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
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

      // Standard fetches
      const fetchPromises: [Promise<any>, Promise<any>, Promise<any>?] = [
        financeApi.getExpenses(params),
        financeApi.getIncomes(params)
      ];

      // Only fetch forms if a workspace is selected
      if (selectedWorkspace) {
        fetchPromises.push(financeApi.getForms(selectedWorkspace.id));
      }

      const responses = await Promise.all(fetchPromises);
      const expensesRes = responses[0];
      const incomeRes = responses[1];
      const formsRes = responses[2];

      let mappedCustomExpenses: any[] = [];

      // Only process forms and entries if they exist
      if (formsRes && formsRes.data) {
        try {
          const entryPromises = formsRes.data.map((f: any) => financeApi.getEntries(f.id));
          const entriesResponses = await Promise.all(entryPromises);

          entriesResponses.forEach((res, index) => {
            const form = formsRes.data[index];
            const amountFields = form.fields.filter((f: any) =>
              ['montant', 'amount', 'prix', 'total'].includes(f.label.toLowerCase())
            );

            res.data.forEach((entry: any) => {
              let amount = 0;
              for (const f of amountFields) {
                const val = entry.data[f.id];
                if (val) {
                  amount = parseFloat(val) || 0;
                  break;
                }
              }

              mappedCustomExpenses.push({
                id: `entry-${entry.id}`,
                date: entry.created_at.split('T')[0],
                type: 'EXPENSE',
                category: form.name,
                amount: amount,
                comment: Object.entries(entry.data).map(([k, v]) => `${k}: ${v}`).join(', ')
              });
            });
          });
        } catch (err) {
          console.warn("Failed to fetch custom entries", err);
        }
      }

      const mappedExpenses = expensesRes.data.map((ex: any) => ({
        id: ex.id.toString(),
        date: ex.date.split('T')[0],
        type: 'EXPENSE',
        category: ex.category || 'AUTRE',
        amount: Number(ex.amount) || 0,
        comment: ex.comment || ''
      }));

      const mappedIncomes = incomeRes.data.map((inc: any) => ({
        id: inc.id.toString(),
        date: inc.date.split('T')[0],
        type: 'INCOME',
        category: inc.type || 'FORMATION',
        subType: inc.subtype || '',
        amount: Number(inc.amount) || 0,
        studentCount: Number(inc.student_count) || 0,
        comment: inc.student_count > 0 ? `${inc.student_count} étudiants` : ''
      }));

      const allTransactions = [...mappedExpenses, ...mappedIncomes, ...mappedCustomExpenses];
      setTransactions(allTransactions.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (error) {
      console.error("Failed to fetch transactions", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await authApi.getMe();
          const userData = response.data;
          setUser({
            id: userData.id.toString(),
            full_name: userData.full_name || userData.email.split('@')[0],
            email: userData.email,
            role: userData.role,
            status: userData.status
          });

          if (userData.status === 'REJECTED') {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            setUser(null);
          }
        } catch (error) {
          console.error("Session restoration failed", error);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, selectedWorkspace]);

  // Simple route guard
  useEffect(() => {
    if (user && user.role !== 'ADMIN' && currentPage === 'dashboard') {
      setCurrentPage('expenses');
    }
  }, [user, currentPage]);

  if (!user || (user.status === 'PENDING' && user.role !== 'ADMIN')) {
    return <Login onLogin={setUser} />;
  }

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
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setUser(null);
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
