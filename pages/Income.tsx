
import React, { useState, useEffect } from 'react';
import { Transaction, IncomeType, FeeType, Workspace } from '../types';
import { formatHTG, formatGourdesShort } from '../constants';
import { financeApi } from '../api';
import { useLanguage } from '../context/LanguageContext';

interface IncomeProps {
  transactions: Transaction[];
  onAdd: (tx: Transaction) => void;
  selectedWorkspace?: Workspace;
  role?: string;
}

const Income: React.FC<IncomeProps> = ({ transactions, onAdd, selectedWorkspace, role }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    incomeType: IncomeType.PLATFORM,
    feeType: FeeType.PARTICIPATION,
    studentCount: '1',
    unitPrice: '1000',
    comment: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const count = parseInt(formData.studentCount) || 0;
    const price = parseFloat(formData.unitPrice) || 0;
    setTotal(count * price);
  }, [formData.studentCount, formData.unitPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    if (!navigator.onLine) {
      setError('Vous êtes hors ligne. Veuillez vous connecter à Internet pour enregistrer une rentrée.');
      setIsLoading(false);
      return;
    }

    try {
      await financeApi.createIncome({
        type: formData.incomeType,
        subtype: formData.feeType === FeeType.CUSTOM ? null : formData.feeType,
        amount: total,
        student_count: parseInt(formData.studentCount),
        comment: formData.comment || `${formData.studentCount} étudiants - ${formData.feeType}`,
        date: formData.date,
        workspace_id: selectedWorkspace?.id
      });

      onAdd({} as any); // Trigger refresh
      setSuccess(true);
      setFormData({ ...formData, studentCount: '1', comment: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.status === 403) {
        setError('Votre compte est en attente d\'approbation par un administrateur.');
      } else {
        setError('Erreur lors de l\'enregistrement du revenu.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet enregistrement ?')) return;

    try {
      await financeApi.deleteIncome(parseInt(id));
      onAdd({} as any); // Trigger refresh
    } catch (err) {
      console.error("Failed to delete income", err);
      alert("Erreur lors de la suppression.");
    }
  };

  const incomeHistory = transactions.filter(tx => tx.type === 'INCOME');

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-6 duration-700">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest mb-2 border border-emerald-100 dark:border-emerald-500/20">
            Revenue Logs
          </div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{t('add_income') || 'Rentrées'}</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Track capital inflows and student registrations.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Form Column */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="font-black text-slate-800 dark:text-white tracking-tight mb-6 uppercase text-xs tracking-widest text-slate-400">Nouvelle Rentrée</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Type</label>
                  <select
                    value={formData.incomeType}
                    onChange={e => setFormData({ ...formData, incomeType: e.target.value as IncomeType })}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 appearance-none"
                  >
                    {Object.values(IncomeType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Frais</label>
                  <select
                    value={formData.feeType}
                    onChange={e => setFormData({ ...formData, feeType: e.target.value as FeeType })}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 appearance-none"
                  >
                    {Object.values(FeeType).map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Nb. Étudiants</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.studentCount}
                    onChange={e => setFormData({ ...formData, studentCount: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Prix Unit. (HTG)</label>
                  <input
                    type="number"
                    value={formData.unitPrice}
                    onChange={e => setFormData({ ...formData, unitPrice: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('date')}</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                />
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-500/5 px-6 py-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20 flex flex-col justify-center items-center gap-1 group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150"></div>
                <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-[0.2em] relative z-10">Total Recettes</span>
                <span className="text-4xl font-black text-emerald-600 dark:text-emerald-500 tracking-tighter relative z-10">{formatGourdesShort(total)}</span>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('comments')}</label>
                <textarea
                  rows={2}
                  value={formData.comment}
                  onChange={e => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="Notes optionnelles..."
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all resize-none text-sm font-medium dark:text-slate-200"
                ></textarea>
              </div>

              {error && <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold rounded-2xl border border-red-100 dark:border-red-500/20 animate-in shake">{error}</div>}
              {success && <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-2xl border border-emerald-100 dark:border-emerald-500/20 animate-in zoom-in">Rentrée enregistrée!</div>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 bg-[#131b2e] dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-black rounded-2xl transition-all active:scale-[0.99] shadow-xl shadow-slate-200 dark:shadow-none uppercase tracking-widest text-xs"
              >
                {isLoading ? 'Chagement...' : t('save')}
              </button>
            </form>
          </div>
        </div>

        {/* History Column */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex justify-between items-end mb-4">
              <div>
                <h3 className="font-black text-slate-800 dark:text-white tracking-tight uppercase text-xs tracking-widest text-slate-400">Historique des Rentrées</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Flux entrants récents</p>
              </div>
              <span className="text-[10px] font-black px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg uppercase tracking-widest">{incomeHistory.length} logs</span>
            </div>

            <div className="px-4 pb-4 space-y-3 max-h-[700px] overflow-y-auto no-scrollbar">
              {incomeHistory.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl group hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#f0fdf4] text-emerald-600">
                      <span className="text-lg">↑</span>
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-800 dark:text-white group-hover:text-emerald-500 transition-colors uppercase tracking-tight">{tx.category}</div>
                      <div className="text-[10px] text-blue-500 dark:text-blue-400 font-black uppercase tracking-widest mt-0.5">{tx.subType || '-'} - {new Date(tx.date).toLocaleDateString()}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400 font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700 uppercase">{tx.studentCount} Étudiants</span>
                        {tx.comment && tx.comment !== `${tx.studentCount} étudiants - ${tx.subType}` && (
                          <span className="text-[10px] text-slate-400 italic">"{tx.comment.substring(0, 30)}..."</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-base font-black tracking-tight text-emerald-600">
                      +{formatHTG(tx.amount)}
                    </div>
                    {role === 'ADMIN' && (
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {incomeHistory.length === 0 && (
                <div className="px-8 py-20 text-center text-slate-300 font-black italic uppercase tracking-widest">Aucune rentrée trouvée</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Income;
