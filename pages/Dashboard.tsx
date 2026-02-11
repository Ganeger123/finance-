
import React from 'react';
import { Transaction } from '../types';
import { formatHTG, COLORS } from '../constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

import { financeApi } from '../apiClient';

interface DashboardProps {
  transactions: Transaction[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const [dashboardData, setDashboardData] = React.useState<{
    total_income: number;
    total_expenses: number;
    net_result: number;
    margin: number;
    monthly_stats: any[];
  } | null>(null);

  React.useEffect(() => {
    fetchDashboardData();
  }, [selectedYear, transactions]);

  const fetchDashboardData = async () => {
    try {
      const res = await financeApi.getDashboardSummary(selectedYear);
      setDashboardData(res.data);
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    }
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('dashboard-content');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#fcfdfe' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('Panacée-Financial-Report.pdf');
    } catch (error) {
      console.error(error);
    }
  };

  const totals = {
    income: dashboardData?.total_income || 0,
    expense: dashboardData?.total_expenses || 0
  };
  const net = dashboardData?.net_result || 0;
  const margin = dashboardData?.margin || 0;

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
    }, []);

  return (
    <div id="dashboard-content" className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Tableau de Bord</h2>
          <p className="text-[11px] text-slate-400 font-bold mt-1">Vue d'ensemble de vos finances</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 opacity-50 group-focus-within:opacity-100 transition-opacity">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher..."
              className="bg-transparent border-none text-[11px] font-bold text-slate-500 placeholder:text-slate-300 outline-none w-48 pl-10"
            />
          </div>

          <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
            <button className="relative p-1 text-slate-400 hover:text-emerald-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
            </button>
            <div className="text-[11px] font-black text-slate-900 flex items-center gap-2">
              <span className="opacity-40">🔔</span>
              <span>samedi 7 février 2026</span>
            </div>
          </div>
        </div>
      </header>

      {/* KPI Cards - Updated to match screenshot design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Rentrees */}
        <div className="bg-[#f0fdf4] dark:bg-emerald-950/20 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/10 transition-all duration-300 hover:shadow-lg">
          <div className="flex justify-between items-start mb-6">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Rentrées</span>
            <div className="p-2.5 bg-[#dcfce7] dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mb-2">
            {formatHTG(totals.income)}
          </div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600">
            <span className="text-xs">↑</span> 12.5% <span className="text-slate-400 font-bold uppercase tracking-widest ml-1 opacity-60">vs mois dernier</span>
          </div>
        </div>

        {/* Card 2: Total Depenses */}
        <div className="bg-[#fef2f2] dark:bg-red-950/20 p-8 rounded-[2rem] border border-red-100 dark:border-red-500/10 transition-all duration-300 hover:shadow-lg">
          <div className="flex justify-between items-start mb-6">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Dépenses</span>
            <div className="p-2.5 bg-[#fee2e2] dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-2xl shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" /></svg>
            </div>
          </div>
          <div className="text-3xl font-black text-red-600 dark:text-red-400 tracking-tight mb-2">
            {formatHTG(totals.expense)}
          </div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-red-600">
            <span className="text-xs">↓</span> 3.2% <span className="text-slate-400 font-bold uppercase tracking-widest ml-1 opacity-60">vs mois dernier</span>
          </div>
        </div>

        {/* Card 3: Resultat Net */}
        <div className="bg-[#f0fdf4] dark:bg-emerald-950/20 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/10 transition-all duration-300 hover:shadow-lg">
          <div className="flex justify-between items-start mb-6">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Résultat Net</span>
            <div className="p-2.5 bg-[#dcfce7] dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mb-2">
            {formatHTG(net)}
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Bénéfice</div>
        </div>

        {/* Card 4: Marge Beneficiaire */}
        <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 hover:shadow-lg">
          <div className="flex justify-between items-start mb-6">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Marge Bénéficiaire</span>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
            65.0%
          </div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600">
            <span className="text-xs">↑</span> 2.1% <span className="text-slate-400 font-bold uppercase tracking-widest ml-1 opacity-60">vs mois dernier</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Financial Overview - Updated colors to match screenshot */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Aperçu Financier</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic opacity-60">Évolution des 5 derniers mois</p>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div> Rentrées
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div> Dépenses
              </div>
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barGap={12}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                  dy={15}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
                  contentStyle={{
                    backgroundColor: '#131b2e',
                    borderRadius: '16px',
                    border: 'none',
                    color: '#fff',
                    padding: '15px',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}
                />
                <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} barSize={22} />
                <Bar dataKey="expense" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Donut - Matching screenshot side legend */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Rentrées par Catégorie</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic opacity-60">Répartition du mois</p>
          </div>
          <div className="flex-1 min-h-[240px] relative mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={105}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  {expenseByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#131b2e' : COLORS.chart[index % COLORS.chart.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 space-y-4">
            {expenseByCategory.slice(0, 3).map((item, i) => (
              <div key={item.name} className="flex flex-col gap-1">
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i === 0 ? '#131b2e' : COLORS.chart[i % COLORS.chart.length] }}></div>
                  <span className="text-slate-500 dark:text-slate-400">{item.name}</span>
                </div>
                <div className="flex items-center justify-between mt-1 pl-5">
                  <span className="text-[12px] font-black text-slate-900 dark:text-white tracking-tight">{formatHTG(item.value)}</span>
                  <span className="text-[10px] text-slate-400 font-bold">({Math.round((item.value / (totals.expense || 1)) * 100)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity / Transactions - Matching screenshot row design */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-10 py-8 flex justify-between items-end mb-2">
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Transactions Récentes</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">Dernières activités financières</p>
            </div>
            <button className="text-[10px] font-black text-slate-500 hover:text-emerald-500 transition-colors uppercase tracking-widest border-b-2 border-transparent hover:border-emerald-500 pb-1">Voir tout</button>
          </div>
          <div className="px-6 pb-8 space-y-2">
            {transactions.slice(0, 5).map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-5 bg-[#f8fafc]/50 dark:bg-slate-800/20 rounded-[2rem] group hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-100/50 dark:hover:shadow-none border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all duration-500">
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${tx.type === 'INCOME' ? 'bg-[#f0fdf4] text-emerald-600' : 'bg-[#fef2f2] text-red-600'}`}>
                    <span className="text-xl">{tx.type === 'INCOME' ? '↑' : '↓'}</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-black text-slate-800 dark:text-white uppercase tracking-tight antialiased">
                      {tx.category.toLowerCase().replace('-', ' ')} {tx.comment ? `- ${tx.comment.toLowerCase()}` : ''}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60">
                      {tx.category} • 2 févr.
                    </div>
                  </div>
                </div>
                <div className={`text-[15px] font-black tracking-tight ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}{formatHTG(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vendor Performance Placeholder - Matching screenshot side card */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Performance Vendeurs</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">Commissions du mois</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[11px] text-slate-300 font-black uppercase tracking-[0.2em] italic">Aucun vendeur</p>
            </div>
          </div>

          <div className="mt-auto pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic opacity-60">Total Commissions</span>
            <span className="font-black text-slate-900 dark:text-white tracking-tight">0 HTG</span>
          </div>
        </div>
      </div>
    </div>

  );
};

export default Dashboard;
