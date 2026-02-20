import React, { useState } from 'react';
import { Transaction, Workspace } from '../types';
import { formatHTG } from '../constants';
import { financeApi } from '../apiClient';
import { useToast } from '../context/ToastContext';
import { Banknote, Trash2, ArrowUpRight, Search } from 'lucide-react';
import TransactionForm from '../components/TransactionForm';

interface IncomeProps {
  transactions: Transaction[];
  onAdd: () => void;
  selectedWorkspace?: Workspace;
  role?: string;
}

const Income: React.FC<IncomeProps> = ({ transactions, onAdd, selectedWorkspace, role }) => {
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this income record?')) return;
    try {
      await financeApi.deleteIncome(parseInt(id));
      addToast('success', 'Income deleted');
      onAdd();
    } catch (err) {
      addToast('error', 'Failed to delete');
    }
  };

  const incomeHistory = transactions
    .filter(tx => tx.type === 'INCOME')
    .filter(tx =>
      tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.comment || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] mb-3 border border-emerald-100">
            Revenue Logs
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Income</h2>
          <p className="text-slate-500 font-medium mt-1">Track capital inflows and student registrations.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-5">
          <div className="fintrack-card p-8 sticky top-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-500" />
                New Income
              </h3>
            </div>

            <TransactionForm
              type="INCOME"
              onSuccess={onAdd}
              selectedWorkspace={selectedWorkspace}
            />
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-[1.5rem] border border-slate-100 shadow-sm">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search income..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-300"
            />
          </div>

          <div className="fintrack-card overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Income History</h3>
              <span className="text-[10px] font-black px-2 py-1 bg-white border border-slate-100 rounded-lg text-slate-500">
                {incomeHistory.length} Entries
              </span>
            </div>

            <div className="divide-y divide-slate-50 max-h-[700px] overflow-y-auto no-scrollbar">
              {incomeHistory.length > 0 ? incomeHistory.map(tx => (
                <div key={tx.id} className="p-6 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-sm">
                      <ArrowUpRight className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{tx.category}</p>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">{tx.studentCount || 0} Students</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {tx.date} • {tx.comment || 'No notes'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <p className="text-base font-black text-emerald-500 tracking-tight">
                      +{formatHTG(tx.amount)}
                    </p>
                    {(role === 'admin' || role === 'super_admin') && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="p-20 text-center">
                  <Banknote className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-400">No income records found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Income;
