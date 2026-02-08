
import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const Settings: React.FC = () => {
    const { theme, setTheme } = useTheme();
    const { language, setLanguage, t } = useLanguage();

    return (
        <div className="space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-top-4 duration-700 p-4 sm:p-8">
            <header>
                <div className="inline-flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full uppercase tracking-widest mb-2 border border-blue-100 dark:border-blue-500/20">
                    {t('settings')}
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{t('settings')}</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Gérez vos préférences d'affichage et de langue.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                {/* Theme Setting */}
                <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
                    <div className="flex items-center gap-4">
                        <span className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl text-xl">🌓</span>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white">{t('theme')}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Choisissez l'apparence de l'interface.</p>
                        </div>
                    </div>

                    <div className="flex p-1 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                        <button
                            onClick={() => setTheme('light')}
                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${theme === 'light'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            ☀️ {t('light_mode')}
                        </button>
                        <button
                            onClick={() => setTheme('dark')}
                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${theme === 'dark'
                                ? 'bg-white dark:bg-slate-700 text-blue-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            🌙 {t('dark_mode')}
                        </button>
                    </div>
                </div>

                {/* Language Setting */}
                <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
                    <div className="flex items-center gap-4">
                        <span className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xl">🌐</span>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white">{t('language')}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sélectionnez votre langue préférée.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 'fr', label: 'Français', emoji: '🇫🇷' },
                            { id: 'en', label: 'English', emoji: '🇺🇸' },
                            { id: 'ht', label: 'Kreyòl', emoji: '🇭🇹' },
                        ].map((lang) => (
                            <button
                                key={lang.id}
                                onClick={() => setLanguage(lang.id as any)}
                                className={`py-4 px-2 rounded-2xl text-[10px] font-black transition-all border ${language === lang.id
                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'
                                    }`}
                            >
                                <div className="text-lg mb-1">{lang.emoji}</div>
                                {lang.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Preview Section */}
            <div className="bg-[#0d1421] dark:bg-slate-900 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] text-white space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[80px] rounded-full"></div>
                <h3 className="text-2xl font-black tracking-tight relative z-10">Panacée FinSys Premium</h3>
                <p className="text-slate-400 font-medium max-w-md relative z-10">
                    L'expérience utilisateur a été optimisée pour la clarté et la rapidité. Vos réglages sont synchronisés avec votre navigateur.
                </p>
            </div>
        </div>
    );
};

export default Settings;
