import React, { useState } from 'react';
import { financeApi } from '../api';
import { User } from '../types';
import { formatHTG } from '../constants';
import { useLanguage } from '../context/LanguageContext';

interface ReportsProps {
    user: User | null;
}

const Reports: React.FC<ReportsProps> = ({ user }) => {
    const { t } = useLanguage();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    const monthNames = t('months');
    const months = Array.isArray(monthNames)
        ? monthNames.map((label: string, index: number) => ({ value: index + 1, label }))
        : [];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    const handleDownloadReport = async () => {
        setIsGenerating(true);
        setError('');

        try {
            const response = await financeApi.downloadReport(selectedYear, selectedMonth);

            // Create a blob from the response data
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);

            // Create a link and click it to download
            const link = document.createElement('a');
            link.href = url;
            const monthName = months.find(m => m.value === selectedMonth)?.label;
            link.setAttribute('download', `Rapport_Financier_${selectedYear}_${monthName}.pdf`);
            document.body.appendChild(link);
            link.click();

            // Cleanup
            link.remove();
            window.URL.revokeObjectURL(url);

        } catch (err) {
            console.error("Failed to generate report", err);
            setError(t('error_generating_report'));
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('financial_reports')}</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">{t('financial_reports_desc')}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">{t('report_settings')}</h3>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">{t('month')}</label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-800 dark:text-white appearance-none"
                            >
                                {months.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">{t('year')}</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-800 dark:text-white appearance-none"
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleDownloadReport}
                            disabled={isGenerating}
                            className="w-full py-5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-black rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-slate-200 dark:shadow-none flex items-center justify-center gap-3"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>{t('generating')}</span>
                                </>
                            ) : (
                                <>
                                    <span>📄</span>
                                    <span>{t('download_pdf')}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="bg-[#0d1421] dark:bg-slate-950 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 dark:shadow-none border border-slate-800 dark:border-slate-800 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="p-4 bg-slate-800/50 w-fit rounded-2xl mb-6 backdrop-blur-sm border border-slate-700/50">
                                <span className="text-3xl">📊</span>
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">{t('complete_reports')}</h3>
                            <p className="text-slate-400 font-medium leading-relaxed">
                                {t('reports_desc_long')}
                            </p>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-800/50 flex gap-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('format')}</span>
                                <span className="text-white font-bold">PDF A4</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-800 pl-4">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('security')}</span>
                                <span className="text-emerald-400 font-bold">{t('encrypted')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
