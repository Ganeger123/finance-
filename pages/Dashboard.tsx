import React from 'react';
import { Transaction } from '../types';
import { formatHTG } from '../constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import StatCard from '../components/StatCard';
import { financeApi } from '../apiClient';
import { ArrowUpRight, ArrowDownRight, Calendar, ChevronRight, Activity, Clock } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
}

const DASHBOARD_COLORS = {
  income: '#374b91',
  expense: '#2dd4bf',
  pie: ['#374b91', '#4f46e5', '#fb7185', '#2dd4bf', '#10b981']
};

const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  const [selectedYear] = React.useState(new Date().getFullYear());
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

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Balance"
          value={formatHTG(net)}
          accentColor="turquoise"
          footer={<div className="h-1.5 w-full bg-accent-turquoise/20 rounded-full overflow-hidden"><div className="h-full bg-accent-turquoise" style={{ width: '70%' }}></div></div>}
        />
        <StatCard
          title="Monthly Income"
          value={formatHTG(totals.income)}
          accentColor="blue"
          footer={<div className="flex items-center gap-1 text-emerald-500 text-[10px] font-black uppercase tracking-widest"><ArrowUpRight className="w-3 h-3" /> Growth +12%</div>}
        />
        <StatCard
          title="Monthly Expenses"
          value={formatHTG(totals.expense)}
          accentColor="coral"
          footer={<div className="flex items-center gap-1 text-rose-500 text-[10px] font-black uppercase tracking-widest"><ArrowDownRight className="w-3 h-3" /> Reduced -4%</div>}
        />
        <StatCard
          title="Budget Left"
          value={formatHTG(budgetLeft)}
          accentColor="green"
          footer={<div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Safe to Spend</div>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Section: Charts */}
        <div className="lg:col-span-8 space-y-10">
          {/* Income vs Expenses Bar Chart */}
          <div className="fintrack-card p-10">
            <div className="flex items-center justify-between mb-10">
              <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-3 text-lg">
                Financial Overview
                <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-1 rounded-md uppercase tracking-widest">Active</span>
              </h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                  <div className="w-2 h-2 rounded-full bg-[#374b91]"></div> Income
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                  <div className="w-2 h-2 rounded-full bg-accent-turquoise"></div> Expenses
                </div>
              </div>
            </div>

            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barGap={12}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
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
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: 'var(--shadow-lg)', padding: '16px' }}
                  />
                  <Bar dataKey="income" fill={DASHBOARD_COLORS.income} radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="expense" fill={DASHBOARD_COLORS.expense} radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Expense Breakdown (Donut) */}
            <div className="fintrack-card p-8">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Expenses by Category</h4>
              <div className="h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {expenseByCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={DASHBOARD_COLORS.pie[index % DASHBOARD_COLORS.pie.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Spent</span>
                  <span className="text-xl font-black text-slate-800">100%</span>
                </div>
              </div>
              <div className="mt-8 space-y-3">
                {expenseByCategory.slice(0, 3).map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DASHBOARD_COLORS.pie[i] }}></div>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-slate-800">{Math.round((item.value / (totals.expense || 1)) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Insights / Growth Placeholder */}
            <div className="bg-[#131b2e] p-8 rounded-[2.5rem] text-white flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
              <div>
                <Activity className="w-8 h-8 text-accent-turquoise mb-6" />
                <h4 className="text-xl font-black tracking-tight mb-2">Platform Insights</h4>
                <p className="text-slate-400 text-xs font-medium leading-relaxed">
                  Your monthly saving rate is up by 15%. Keep track of your bills to avoid late fees.
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Health</span>
                <span className="text-emerald-400 text-[10px] font-black uppercase">Optimal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Lists (Transactions & Bills) */}
        <div className="lg:col-span-4 space-y-10">
          <div className="fintrack-card p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-slate-800 tracking-tight text-sm uppercase tracking-widest">Activity</h3>
              <button className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline">See all</button>
            </div>

            <div className="space-y-6">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${tx.type === 'INCOME' ? 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white'}`}>
                      {tx.type === 'INCOME' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{tx.category}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{tx.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black tracking-tighter ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatHTG(tx.amount).replace('HTG', '').trim()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="fintrack-card p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-slate-800 tracking-tight text-sm uppercase tracking-widest">Upcoming Bills</h3>
              <Clock className="w-4 h-4 text-slate-300" />
            </div>

            <div className="space-y-4">
              {[
                { id: 1, title: 'Rent Payment', amount: 1200, date: 'May 1', status: 'Pending' },
                { id: 2, title: 'Cloud Hosting', amount: 840, date: 'May 5', status: 'Scheduled' },
                { id: 3, title: 'Gym Access', amount: 45, date: 'May 15', status: 'Autopay' }
              ].map(bill => (
                <div key={bill.id} className="p-4 rounded-3xl bg-slate-50 border border-slate-100 group hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{bill.title}</span>
                    </div>
                    <span className="text-xs font-black text-slate-800">${bill.amount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{bill.date}</span>
                    <span className="text-[9px] font-black text-indigo-500 bg-white px-2 py-0.5 rounded border border-slate-100 uppercase">{bill.status}</span>
                  </div>
                </div>
              ))}
              <button className="w-full py-4 mt-2 border-2 border-dashed border-slate-100 rounded-3xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-400 transition-all">
                Add Reminder +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
