import React, { useState } from 'react';
import { Transaction } from '../types';
import { formatHTG } from '../constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import StatCard from '../components/StatCard';
import { financeApi } from '../apiClient';
import { ArrowUpRight, ArrowDownRight, Calendar, ChevronRight, Activity, Clock, Edit3, Trash2, Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

interface DashboardProps {
  transactions: Transaction[];
  onAddExpense?: () => void;
}

const DASHBOARD_COLORS = {
  income: '#374b91',
  expense: '#2dd4bf',
  pie: ['#374b91', '#4f46e5', '#fb7185', '#2dd4bf', '#10b981']
};

const CATEGORY_COLORS: { [key: string]: string } = {
  'Utilities': 'bg-emerald-50 text-emerald-600',
  'Office': 'bg-indigo-50 text-indigo-600',
  'Food': 'bg-amber-50 text-amber-600',
  'Travel': 'bg-blue-50 text-blue-600',
  'Entertainment': 'bg-pink-50 text-pink-600',
  'Transport': 'bg-purple-50 text-purple-600',
  'Groceries': 'bg-green-50 text-green-600',
  'Health': 'bg-red-50 text-red-600',
};

const Dashboard: React.FC<DashboardProps> = ({ transactions, onAddExpense }) => {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [selectedYear] = React.useState(new Date().getFullYear());
  const [quickAddText, setQuickAddText] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [dashboardData, setDashboardData] = React.useState<{
    total_income: number;
    total_expenses: number;
    net_result: number;
    monthly_stats: any[];
  } | null>(null);

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await financeApi.getDashboardSummary(selectedYear);
        setDashboardData(res.data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      }
    };
    fetchDashboardData();
  }, [selectedYear, transactions]);

  const totals = {
    income: dashboardData?.total_income || 0,
    expense: dashboardData?.total_expenses || 0
  };
  const net = dashboardData?.net_result || 0;
  const budgetLeft = Math.max(0, totals.income - totals.expense);

  const monthlyData = dashboardData?.monthly_stats?.map(m => ({
    name: new Date(selectedYear, m.month - 1).toLocaleString('default', { month: 'short' }),
    income: m.income,
    expense: m.expense
  })) || [];

  const expenseByCategory = transactions
    .filter(tx => tx.type === 'EXPENSE')
    .reduce((acc: any[], tx) => {
      const existing = acc.find(i => i.name === tx.category);
      if (existing) existing.value += tx.amount;
      else acc.push({ name: tx.category, value: tx.amount });
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value);

  const recentTransactions = transactions.slice(0, 5);

  const toggleNote = (id: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNotes(newExpanded);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await financeApi.deleteExpense(parseInt(id));
      addToast('success', 'Transaction deleted');
      if (onAddExpense) onAddExpense();
    } catch (err) {
      addToast('error', 'Failed to delete transaction');
    }
  };

  const getCategoryColor = (category: string) => {
    return CATEGORY_COLORS[category] || 'bg-slate-50 text-slate-600';
  };

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">Welcome back, Alex!</h1>
          <p className="text-slate-500 text-sm font-medium">Track your finances and stay on budget</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-emerald-50 rounded-full border border-emerald-200 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-xs font-bold text-emerald-700">Email Connected</span>
            <span className="text-emerald-600">✓</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
            <span className="text-sm font-bold">🔔</span>
          </div>
        </div>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="fintrack-card p-8 bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-[2.5rem]">
          <p className="text-sm font-bold opacity-90 mb-4">Total Balance</p>
          <h3 className="text-4xl font-black tracking-tighter">{formatHTG(net)}</h3>
        </div>
        <div className="fintrack-card p-8 bg-gradient-to-br from-pink-600 to-rose-500 text-white rounded-[2.5rem]">
          <p className="text-sm font-bold opacity-90 mb-4">Monthly Income</p>
          <h3 className="text-4xl font-black tracking-tighter">{formatHTG(totals.income)}</h3>
        </div>
        <div className="fintrack-card p-8 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-[2.5rem]">
          <p className="text-sm font-bold opacity-90 mb-4">Monthly Expenses</p>
          <h3 className="text-4xl font-black tracking-tighter">-{formatHTG(totals.expense).replace('HTG', '').trim()}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">
          {/* Quick Add Section */}
          <div className="fintrack-card p-8 rounded-[2.5rem]">
            <h3 className="text-lg font-black text-slate-900 mb-6">Quick Add</h3>
            <div className="flex gap-4 items-center">
              <input
                type="text"
                placeholder="Spent $45 on internet bill yesterday."
                value={quickAddText}
                onChange={(e) => setQuickAddText(e.target.value)}
                className="flex-1 px-6 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium"
              />
              <button
                onClick={() => {
                  addToast('info', `Parsed: ${quickAddText}`);
                  setQuickAddText('');
                  if (onAddExpense) onAddExpense();
                }}
                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 whitespace-nowrap"
              >
                Add Expense
              </button>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="fintrack-card rounded-[2.5rem] overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Expenses</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-8 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-widest">Category</th>
                    <th className="px-8 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-widest">Description</th>
                    <th className="px-8 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-widest">Amount</th>
                    <th className="px-8 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-widest">Date</th>
                    <th className="px-8 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.filter(tx => tx.type === 'EXPENSE').length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold tracking-wide">
                        No recent expenses found. Add one above!
                      </td>
                    </tr>
                  ) : (
                    recentTransactions.filter(tx => tx.type === 'EXPENSE').map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4">
                          <div className={`inline-flex items-center gap-3 px-3 py-1 rounded-lg ${getCategoryColor(tx.category)}`}>
                            <div className="w-2 h-2 rounded-full bg-current"></div>
                            <span className="text-xs font-bold uppercase tracking-tight">{tx.category}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          {tx.comment && tx.comment.length > 30 && !expandedNotes.has(tx.id) ? (
                            <div>
                              <p className="text-sm text-slate-700 font-medium">{tx.comment.substring(0, 30)}...</p>
                              <button
                                onClick={() => toggleNote(tx.id)}
                                className="text-xs text-indigo-600 font-bold mt-1 hover:underline"
                              >
                                Read More
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-700 font-medium">{tx.comment || 'No notes'}</p>
                          )}
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-sm font-black text-rose-600">${tx.amount.toFixed(2)}</span>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-xs font-bold text-slate-500">{tx.date}</span>
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Online Users */}
        <div className="fintrack-card p-8 rounded-[2.5rem] h-fit">
          <h3 className="text-lg font-black text-slate-900 mb-6">Online Users</h3>
          <div className="space-y-4">
            {[
              { name: 'John_Doe', online: true },
              { name: 'Ani_Clark', online: true },
              { name: 'Admin User', online: false }
            ].map((user, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                    {user.name.charAt(0)}
                  </div>
                  <span className="font-bold text-sm text-slate-800">{user.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${user.online ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  {user.online && <span className="text-xs font-bold text-emerald-600">✓</span>}
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600">
            View All
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
