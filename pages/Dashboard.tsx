
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

import { financeApi } from '../api';

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
  }, [selectedYear, transactions]); // Re-fetch when transactions change too, as a simple way to keep sync

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

    // ... existing PDF logic ...
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#fcfdfe' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('Panace-Financial-Report.pdf');
    } catch (error) {
      console.error(error);
    }
  };

  // Safe defaults if data loading
  const totals = {
    income: dashboardData?.total_income || 0,
    expense: dashboardData?.total_expenses || 0
  };
  const net = dashboardData?.net_result || 0;
  const margin = dashboardData?.margin || 0;

  // Use server monthly stats if avail, else fallback to empty or processed
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
    <div id="dashboard-content" className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-700 p-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full uppercase tracking-widest mb-2 border border-blue-100 dark:border-blue-500/20">
            Admin Intelligence Console
          </div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{t('financial_pulse')}</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Holistic tracking for Panace internal assets.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportPDF}
            className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm hover:shadow-md uppercase tracking-wider flex items-center gap-2"
          >
            <span>⬇️</span> {t('export_pdf')}
          </button>
          <button className="px-6 py-3 bg-[#0d1421] text-white rounded-2xl text-xs font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-wider">
            Live Feed
          </button>
        </div>
      </header>

      {/* KPI Cards - Updated to match screenshot design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Rentrees */}
        <div className="bg-[#f0fdf4] dark:bg-emerald-950/20 p-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/10 relative overflow-hidden transition-all duration-300 hover:shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('total_income') || 'Total Rentrées'}</span>
            <div className="p-2 bg-[#dcfce7] dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mb-2">
            {formatHTG(totals.income)}
          </div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-full">
            <span className="text-xs">↑</span> 12.5% <span className="text-slate-400 font-medium">vs mois dernier</span>
          </div>
        </div>

        {/* Card 2: Total Depenses */}
        <div className="bg-[#fef2f2] dark:bg-red-950/20 p-6 rounded-[2rem] border border-red-100 dark:border-red-500/10 relative overflow-hidden transition-all duration-300 hover:shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('total_expenses') || 'Total Dépenses'}</span>
            <div className="p-2 bg-[#fee2e2] dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" /></svg>
            </div>
          </div>
          <div className="text-2xl font-black text-red-600 dark:text-red-400 tracking-tight mb-2">
            {formatHTG(totals.expense)}
          </div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-100/50 px-2 py-0.5 rounded-full">
            <span className="text-xs">↓</span> 3.2% <span className="text-slate-400 font-medium">vs mois dernier</span>
          </div>
        </div>

        {/* Card 3: Resultat Net */}
        <div className="bg-[#f0fdf4] dark:bg-emerald-950/20 p-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/10 relative overflow-hidden transition-all duration-300 hover:shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('net_result') || 'Résultat Net'}</span>
            <div className="p-2 bg-[#dcfce7] dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mb-2">
            {formatHTG(net)}
          </div>
          <div className="text-[10px] font-bold text-slate-400">Bénéfice</div>
        </div>

        {/* Card 4: Marge Beneficiaire */}
        <div className="bg-[#f8fafc] dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 relative overflow-hidden transition-all duration-300 hover:shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('profit_margin') || 'Marge Bénéficiaire'}</span>
            <div className="p-2 bg-[#f1f5f9] dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
            {margin}%
          </div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-full">
            <span className="text-xs">↑</span> 2.1% <span className="text-slate-400 font-medium">vs mois dernier</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Financial Overview - Updated colors to match screenshot */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="font-black text-slate-800 dark:text-white tracking-tight">{t('financial_overview') || 'Aperçu Financier'}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Évolution des 5 derniers mois</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div> {t('incoming') || 'Rentrées'}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div> {t('outcoming') || 'Dépenses'}
              </div>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barGap={10}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    backgroundColor: '#131b2e',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    padding: '12px'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Donut - Matching screenshot side legend */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
          <div>
            <h3 className="font-black text-slate-800 dark:text-white tracking-tight">{t('rentrees_par_categorie') || 'Rentrées par Catégorie'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Répartition du mois</p>
          </div>
          <div className="flex-1 min-h-[220px] relative mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
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
          <div className="mt-6 space-y-4">
            {expenseByCategory.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-[11px] font-bold">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i === 0 ? '#131b2e' : COLORS.chart[i % COLORS.chart.length] }}></div>
                  <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 dark:text-white">{formatHTG(item.value)}</span>
                  <span className="text-slate-400 font-medium">({Math.round((item.value / totals.expense) * 100)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity / Transactions - Matching screenshot row design */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-8 py-6 flex justify-between items-end mb-4">
            <div>
              <h3 className="font-black text-slate-800 dark:text-white tracking-tight">{t('recent_activity') || 'Transactions Récentes'}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Dernières activités financières</p>
            </div>
            <button className="text-[11px] font-black text-slate-500 hover:text-emerald-500 transition-colors uppercase tracking-widest">Voir tout</button>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {transactions.slice(0, 5).map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl group hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'INCOME' ? 'bg-[#f0fdf4] text-emerald-600' : 'bg-[#fef2f2] text-red-600'}`}>
                    <span className="text-lg">{tx.type === 'INCOME' ? '↑' : '↓'}</span>
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-800 dark:text-white group-hover:text-emerald-500 transition-colors uppercase tracking-tight">{tx.category} {tx.comment ? `- ${tx.comment.substring(0, 20)}` : ''}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{tx.category} - {new Date(tx.date).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className={`text-sm font-black tracking-tight ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}{formatHTG(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vendor Performance Placeholder - Matching screenshot side card */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="font-black text-slate-800 dark:text-white tracking-tight">{t('vendor_performance') || 'Performance Vendeurs'}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Commissions du mois</p>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs text-slate-300 font-bold uppercase tracking-widest">Aucun vendeur</p>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Commissions</span>
            <span className="font-black text-slate-900 dark:text-white">0 HTG</span>
          </div>
        </div>
      </div>
    </div>

  );
};

export default Dashboard;
