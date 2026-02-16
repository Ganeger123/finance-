import React, { useState } from 'react';
import { financeApi } from '../apiClient';
import { User } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { FileText, Download, Calendar, ShieldCheck, BarChart3, Loader2 } from 'lucide-react';

interface ReportsProps {
    user: User | null;
}

const Reports: React.FC<ReportsProps> = ({ user }) => {
    const { t } = useLanguage();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    const monthNames = t('months') || [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const months = monthNames.map((label: string, index: number) => ({ value: index + 1, label }));
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    const handleDownloadReport = async () => {
        setIsGenerating(true);
        setError('');
        try {
            const response = await financeApi.downloadReport(selectedYear, selectedMonth);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const monthName = months.find(m => m.value === selectedMonth)?.label;
            link.setAttribute('download', `FinTrack_Report_${selectedYear}_${monthName}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to generate report", err);
            setError('Failed to generate report. Please try again later.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-3 border border-indigo-100">
                        Financial Intelligence
                    </div>
                    <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Reports</h2>
                    <p className="text-slate-500 font-medium mt-1">Generate and export detailed financial statements.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Generation Card */}
                <div className="fintrack-card p-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                            <FileText className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Custom Report</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Month</label>
                                <div className="relative">
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none transition-all font-bold text-slate-700 appearance-none"
                                    >
                                        {months.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                    <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Year</label>
                                <div className="relative">
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none transition-all font-bold text-slate-700 appearance-none"
                                    >
                                        {years.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                    <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-rose-50 text-rose-600 text-xs font-bold rounded-2xl border border-rose-100 animate-in shake">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleDownloadReport}
                            disabled={isGenerating}
                            className="w-full py-5 bg-[#374b91] hover:bg-[#202a54] text-white font-black rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-indigo-100 uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-5 h-5" />
                                    <span>Download PDF Report</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-[#131b2e] p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group border-b-8 border-accent-blue">
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="mb-8">
                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 backdrop-blur-md">
                                <BarChart3 className="w-8 h-8 text-accent-blue" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-4">Complete Financial Insights</h3>
                            <p className="text-slate-400 font-medium leading-relaxed">
                                Our reporting engine generates professional, audit-ready PDF statements including income diversification,
                                expense categorization, and net performance metrics.
                            </p>
                        </div>

                        <div className="mt-auto grid grid-cols-2 gap-4 pt-8 border-t border-white/5">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Standard</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-bold text-sm">PDF / A4</span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Security</span>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-accent-green" />
                                    <span className="text-white font-bold text-sm">Encrypted</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Mini List (Optional concept) */}
            <div className="fintrack-card p-10">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="font-bold text-slate-800">Export History</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Logs showing the last 30 days</p>
                </div>
                <div className="flex items-center justify-center py-10 border-2 border-dashed border-slate-100 rounded-3xl">
                    <p className="text-slate-300 font-bold italic">No recent export logs available.</p>
                </div>
            </div>
        </div>
    );
};

export default Reports;
