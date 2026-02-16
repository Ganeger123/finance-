import React from 'react';
import { Plus, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
    user: User;
    onAddExpense: () => void;
    onAddIncome: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onAddExpense, onAddIncome }) => {
    const today = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <span className="opacity-40 font-medium">Welcome back,</span> {user.full_name.split(' ')[0]}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">{today}</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={onAddExpense}
                    className="bg-[#374b91] hover:bg-[#202a54] text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    Add Expense
                </button>

                <button
                    onClick={onAddIncome}
                    className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-100 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Income
                </button>

                <div className="ml-4 w-12 h-12 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-100 cursor-pointer hover:border-indigo-400 transition-all group overflow-hidden relative">
                    {user.photo_url ? (
                        <img
                            src={user.photo_url}
                            alt={user.full_name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <>
                            <div className="absolute inset-0 bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <UserIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 relative z-10" />
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
