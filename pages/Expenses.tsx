import React, { useState } from 'react';
import { Transaction, Workspace } from '../types';
import { formatHTG } from '../constants';
import { financeApi } from '../apiClient';
import { useToast } from '../context/ToastContext';
import { Receipt, Trash2, Edit3, ArrowDownRight, Search } from 'lucide-react';
import TransactionForm from '../components/TransactionForm';

interface ExpensesProps {
  transactions: Transaction[];
  onAdd: () => void;
  selectedWorkspace?: Workspace;
  role?: string;
}

const Expenses: React.FC<ExpensesProps> = ({ transactions, onAdd, selectedWorkspace, role }) => {
  const { addToast } = useToast();
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await financeApi.deleteExpense(parseInt(id));
      addToast('success', 'Expense deleted');
      onAdd();
    } catch (err) {
      addToast('error', 'Failed to delete');
    }
  };

  const toggleNote = (id: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNotes(newExpanded);
  };

  const expenseHistory = transactions
    .filter(tx => tx.type === 'EXPENSE')
    .filter(tx =>
      tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.comment || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-[0.2em] mb-3 border border-rose-100">
            Internal Ledger
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Expenses</h2>
          <p className="text-slate-500 font-medium mt-1">Manage corporate spending and outgoing cashflow.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-5">
          <div className="fintrack-card p-8 sticky top-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-500" />
                {editingTx ? 'Edit Expense' : 'New Expense'}
              </h3>
              {editingTx && (
                <button
                  onClick={() => setEditingTx(null)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              )}
            </div>

            <TransactionForm
              type="EXPENSE"
              onSuccess={() => {
                setEditingTx(null);
                onAdd();
              }}
              selectedWorkspace={selectedWorkspace}
              initialData={editingTx}
            />
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-[1.5rem] border border-slate-100 shadow-sm">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-300"
            />
          </div>

          <div className="fintrack-card overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Expense History</h3>
              <span className="text-[10px] font-black px-2 py-1 bg-white border border-slate-100 rounded-lg text-slate-500">
                {expenseHistory.length} Entries
              </span>
            </div>

            <div className="divide-y divide-slate-50 max-h-[700px] overflow-y-auto no-scrollbar">
              {expenseHistory.length > 0 ? expenseHistory.map(tx => (
                <div key={tx.id} className="p-6 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-sm">
                      <ArrowDownRight className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{tx.category}</p>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        <span>{tx.date}</span>
                        {tx.comment && (
                          <div className="mt-2">
                            {tx.comment.length > 120 && !expandedNotes.has(tx.id) ? (
                              <div>
                                <p className="text-slate-600 font-medium normal-case">{tx.comment.substring(0, 120)}...</p>
                                <button
                                  onClick={() => toggleNote(tx.id)}
                                  className="text-indigo-500 hover:text-indigo-600 font-bold text-[9px] uppercase tracking-widest mt-1"
                                >
                                  Read More →
                                </button>
                              </div>
                            ) : (
                              <div>
                                <p className="text-slate-600 font-medium normal-case">{tx.comment}</p>
                                {tx.comment.length > 120 && (
                                  <button
                                    onClick={() => toggleNote(tx.id)}
                                    className="text-indigo-500 hover:text-indigo-600 font-bold text-[9px] uppercase tracking-widest mt-1"
                                  >
                                    ← Show Less
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <p className="text-base font-black text-rose-500 tracking-tight">
                      -{formatHTG(tx.amount)}
                    </p>
                    {(role === 'admin' || role === 'super_admin') && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => setEditingTx(tx)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
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
                  <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-400">No records found matching your search</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
