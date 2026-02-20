
import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { formatHTG } from '../constants';
import { useLanguage } from '../context/LanguageContext';

interface SearchProps {
  transactions: Transaction[];
}

const Search: React.FC<SearchProps> = ({ transactions }) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = (tx.category + tx.comment + (tx.subType || '')).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
      const matchesFrom = !dateFrom || tx.date >= dateFrom;
      const matchesTo = !dateTo || tx.date <= dateTo;
      return matchesSearch && matchesType && matchesFrom && matchesTo;
    });
  }, [transactions, searchTerm, typeFilter, dateFrom, dateTo]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 p-4 md:p-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Financial Audit</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Complete historical ledger with real-time intelligence.</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-500/10 px-4 py-2 rounded-2xl border border-blue-100 dark:border-blue-500/20">
          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">{filteredTransactions.length} Transactions found</span>
        </div>
      </header>

      {/* Advanced Filter Bar - Sticky for easy access */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 md:sticky md:top-8 z-30">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('search')}</label>
            <div className="relative group">
              <span className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">🔍</span>
              <input
                type="text"
                placeholder="Category, type or notes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 outline-none text-sm transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold dark:text-slate-200"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Flow Direction</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 outline-none text-sm transition-all font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
            >
              <option value="ALL">All Flows</option>
              <option value="INCOME">{t('income')}</option>
              <option value="EXPENSE">{t('expenses')}</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Period Start</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Period End</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Results Ledger */}
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.25em]">
                <th className="px-10 py-8">{t('date')}</th>
                <th className="px-10 py-8">Description & Meta</th>
                <th className="px-10 py-8">Audit Observation</th>
                <th className="px-10 py-8 text-right">Transaction Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all group cursor-default">
                  <td className="px-10 py-8 text-slate-400 dark:text-slate-500 font-bold text-xs">{tx.date}</td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${tx.type === 'INCOME' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-red-500 shadow-lg shadow-red-500/30'}`}></div>
                      <div>
                        <div className="font-black text-slate-900 dark:text-white text-sm">{tx.category}</div>
                        {tx.subType && (
                          <div className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-wider mt-0.5">{tx.subType}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-slate-500 dark:text-slate-400 font-medium text-xs max-w-xs truncate italic">
                    {tx.comment || "—"}
                  </td>
                  <td className={`px-10 py-8 text-right font-black text-lg tabular-nums tracking-tighter ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatHTG(tx.amount)}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-10 py-32 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <span className="text-6xl">🕵️‍♂️</span>
                      <p className="font-black uppercase tracking-[0.3em] text-slate-400">Zero matches found in records</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-50">
          {filteredTransactions.length === 0 ? (
            <div className="px-10 py-24 text-center text-slate-300 font-black uppercase tracking-widest text-sm">No results found.</div>
          ) : (
            filteredTransactions.map(tx => (
              <div key={tx.id} className="p-8 space-y-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${tx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {tx.type === 'INCOME' ? 'Income' : 'Expense'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">{tx.date}</span>
                    </div>
                    <div className="font-black text-slate-900 text-lg leading-tight">{tx.category}</div>
                    {tx.subType && <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{tx.subType}</div>}
                  </div>
                  <div className={`font-black text-xl tabular-nums tracking-tighter ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatHTG(tx.amount)}
                  </div>
                </div>
                {tx.comment && (
                  <div className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-2xl border border-slate-100/50 font-medium">
                    {tx.comment}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;
