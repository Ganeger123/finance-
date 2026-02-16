
import React, { useState, useEffect } from 'react';
import { Transaction, ExpenseCategory, Workspace } from '../types';
import { formatHTG } from '../constants';
import { financeApi } from '../apiClient';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

interface ExpensesProps {
  transactions: Transaction[];
  onAdd: (tx: Transaction) => void;
  selectedWorkspace?: Workspace;
  role?: string;
}

const Expenses: React.FC<ExpensesProps> = ({ transactions, onAdd, selectedWorkspace, role }) => {
  const { t } = useLanguage();
  const { addToast } = useToast();
  
  // Allow category to be string to support custom values
  const [formData, setFormData] = useState<{
    category: ExpenseCategory | string;
    amount: string;
    comment: string;
    date: string;
  }>({
    category: ExpenseCategory.SALAIRE_FIXE,
    amount: '',
    comment: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [customCategory, setCustomCategory] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>(Object.values(ExpenseCategory));

  const fetchCategories = async () => {
    try {
      const res = await financeApi.getCategories();
      // Merge with defaults and remove duplicates
      const merged = Array.from(new Set([...Object.values(ExpenseCategory), ...res.data]));
      setAvailableCategories(merged);
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setFormData({ category: ExpenseCategory.SALAIRE_FIXE, amount: '', comment: '', date: new Date().toISOString().split('T')[0] });
    setCustomCategory('');
    setEditingId(null);
    setError('');
  };

  const handleEdit = (tx: Transaction) => {
    setEditingId(Number(tx.id));
    setFormData({
      category: tx.category,
      amount: String(tx.amount),
      comment: tx.comment || '',
      date: tx.date || new Date().toISOString().split('T')[0]
    });
    setCustomCategory('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!navigator.onLine) {
      setError('Vous êtes hors ligne. Veuillez vous connecter à Internet pour ajouter une dépense.');
      return;
    }

    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Veuillez entrer un montant valide.');
      return;
    }

    if (formData.amount.length > 6) {
      setError('Le montant ne peut pas dépasser 6 chiffres.');
      return;
    }

    let finalCategory = formData.category;
    if (formData.category === "OTHER") {
      if (!customCategory.trim()) {
        setError('Veuillez spécifier la catégorie.');
        return;
      }
      finalCategory = customCategory.trim();
    }

    setIsLoading(true);
    try {
      const expenseData = {
        category: finalCategory,
        amount: amt,
        comment: formData.comment,
        date: formData.date,
        workspace_id: selectedWorkspace?.id
      };

      if (editingId) {
        // Update existing expense
        await financeApi.updateExpense(editingId, expenseData);
        addToast('success', 'Dépense mise à jour avec succès !');
      } else {
        // Create new expense
        await financeApi.createExpense(expenseData);
        addToast('success', 'Dépense enregistrée !');
      }

      onAdd({} as any); // Trigger refresh in parent
      setSuccess(true);
      resetForm();
      fetchCategories(); // Refresh list to include new custom category

      // Auto-hide success message
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.status === 403) {
        setError('Votre compte est en attente d\'approbation par un administrateur.');
      } else {
        setError('Erreur lors de l\'enregistrement de la dépense.');
      }
      addToast('error', setError);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) return;

    try {
      setIsLoading(true);
      await financeApi.deleteExpense(parseInt(id));
      addToast('success', 'Dépense supprimée');
      onAdd({} as any); // Trigger refresh
    } catch (err) {
      console.error("Failed to delete expense", err);
      addToast('error', 'Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };

  const expenseHistory = transactions.filter(tx => tx.type === 'EXPENSE');

  // Check if current category is a standard one
  const isStandardCategory = Object.values(ExpenseCategory).includes(formData.category as ExpenseCategory);
  // If explicitly custom ("OTHER" selected) or simply not in the list (loaded from history/custom default?)
  // For new entry simplicity: "OTHER" is the sentinel for "show input".
  // If we wanted to edit an existing custom expense, we'd need more logic, but this is "Add Expense".

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-6 duration-700">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest mb-2 border border-emerald-100 dark:border-emerald-500/20">
            Internal Ledger
          </div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{editingId ? 'Éditer la Dépense' : t('add_expense') || 'Dépenses'}</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">{editingId ? 'Modifiez les détails de la dépense.' : 'Manage corporate spending with precision.'}</p>
        </div>
        {editingId && (
          <button
            onClick={resetForm}
            className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-xl transition-all"
          >
            Annuler l'édition
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Form Column */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="font-black text-slate-800 dark:text-white tracking-tight mb-6 uppercase text-xs tracking-widest text-slate-400">{editingId ? 'Éditer la Dépense' : 'Nouvelle Dépense'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('category')}</label>
                <select
                  value={availableCategories.includes(formData.category) ? formData.category : "OTHER"}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "OTHER") {
                      setFormData({ ...formData, category: "OTHER" });
                    } else {
                      setFormData({ ...formData, category: val });
                    }
                  }}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 appearance-none"
                >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {!availableCategories.includes("OTHER") && <option value="OTHER">➕ Autre / Personnalisé</option>}
                </select>

                {formData.category === "OTHER" && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-2">
                    <input
                      type="text"
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value)}
                      placeholder="Nom de la dépense (ex: Carburant)"
                      autoFocus
                      className="w-full px-5 py-4 bg-emerald-50/30 dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('date')}</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('amount')} (HTG)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-black text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('comments')}</label>
                <textarea
                  rows={3}
                  value={formData.comment}
                  onChange={e => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="Justification..."
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all resize-none text-sm font-medium dark:text-slate-200"
                ></textarea>
              </div>

              {error && <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold rounded-2xl border border-red-100 dark:border-red-500/20 animate-in shake">{error}</div>}
              {success && <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-2xl border border-emerald-100 dark:border-emerald-500/20 animate-in zoom-in">{editingId ? 'Dépense mise à jour!' : 'Dépense enregistrée!'}</div>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 bg-[#131b2e] dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-black rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-slate-200 dark:shadow-none uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Traitement...
                  </>
                ) : editingId ? (
                  '✓ Mettre à Jour'
                ) : (
                  t('save')
                )}
              </button>
            </form>
          </div>
        </div>

        {/* History Column */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex justify-between items-end mb-4">
              <div>
                <h3 className="font-black text-slate-800 dark:text-white tracking-tight uppercase text-xs tracking-widest text-slate-400">Historique des Dépenses </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Derniers flux de sortie</p>
              </div>
              <span className="text-[10px] font-black px-3 py-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg uppercase tracking-widest">{expenseHistory.length} logs</span>
            </div>

            <div className="px-4 pb-4 space-y-3 max-h-[600px] overflow-y-auto no-scrollbar">
              {expenseHistory.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl group hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all duration-300">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#fef2f2] text-red-600">
                      <span className="text-lg">↓</span>
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-800 dark:text-white group-hover:text-red-500 transition-colors uppercase tracking-tight">{tx.category}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{tx.category} - {new Date(tx.date).toLocaleDateString()}</div>
                      {tx.comment && <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-1 line-clamp-1">{tx.comment}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-black tracking-tight text-red-600">
                      -{formatHTG(tx.amount)}
                    </div>
                    {(role === 'admin' || role === 'super_admin') && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => handleEdit(tx)}
                          className="text-slate-400 hover:text-blue-500 transition-colors p-1"
                          title="Edit"
                          disabled={isLoading}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1"
                          title="Delete"
                          disabled={isLoading}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {expenseHistory.length === 0 && (
                <div className="px-8 py-20 text-center text-slate-300 font-black italic uppercase tracking-widest">No expenses found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
