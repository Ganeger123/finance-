import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
    Moon,
    Sun,
    Globe,
    Palette,
    Monitor,
    User,
    Camera,
    ShieldCheck,
    ChevronRight,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { authApi } from '../apiClient';
import { User as UserType } from '../types';

interface SettingsProps {
    user: UserType;
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
    const { theme, setTheme } = useTheme();
    const { language, setLanguage, t } = useLanguage();

    const [fullName, setFullName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState('');

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim()) return;
        setIsUpdating(true);
        setSuccess('');
        try {
            await authApi.updateProfile({ full_name: fullName });
            setSuccess('Profile updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setSuccess('');
        const formData = new FormData();
        formData.append('file', file); // FastAPI backend expects 'file'

        try {
            await authApi.uploadPhoto(formData);
            setSuccess(language === 'fr' ? 'Photo téléchargée avec succès !' : 'Photo uploaded successfully!');
            setTimeout(() => {
                setSuccess('');
                window.location.reload(); // Refresh to update all avatars
            }, 2000);
        } catch (err) {
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] mb-3 border border-slate-200">
                    Preferences
                </div>
                <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Settings</h2>
                <p className="text-slate-500 font-medium mt-1">Manage your professional profile and application experience.</p>
            </header>

            {success && (
                <div className="p-4 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-2xl border border-emerald-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 className="w-5 h-5" />
                    {success}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Section */}
                <div className="lg:col-span-2 fintrack-card p-10">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">My Profile</h3>
                            <p className="text-sm text-slate-500 font-medium">Update your public information.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {/* Photo Column */}
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-[2rem] bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                                    {uploading ? (
                                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                    ) : (
                                        user.photo_url ? (
                                            <img
                                                src={user.photo_url}
                                                className="w-full h-full object-cover"
                                                alt="Profile"
                                            />
                                        ) : (
                                            <User className="w-12 h-12 text-slate-300" />
                                        )
                                    )}
                                </div>
                                <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#374b91] text-white rounded-xl shadow-lg border-2 border-white flex items-center justify-center cursor-pointer hover:bg-[#202a54] transition-all group-hover:scale-110">
                                    <Camera className="w-5 h-5" />
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                </label>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">JPG/PNG Max 2MB</p>
                        </div>

                        {/* Info Column */}
                        <form onSubmit={handleProfileUpdate} className="md:col-span-2 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter your full name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none transition-all font-bold text-slate-700"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isUpdating}
                                className="w-full md:w-auto px-10 py-4 bg-[#374b91] text-white font-black rounded-2xl hover:bg-[#202a54] transition-all active:scale-95 shadow-xl shadow-indigo-100 uppercase tracking-widest text-[10px]"
                            >
                                {isUpdating ? (language === 'fr' ? 'Enregistrement...' : 'Saving...') : (language === 'fr' ? 'Mettre à jour' : 'Update Information')}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Status Column */}
                <div className="bg-[#131b2e] p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                    <div className="flex flex-col h-full">
                        <div className="mb-8">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 backdrop-blur-md">
                                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-4 tracking-tight">Security & Privacy</h3>
                            <p className="text-slate-400 font-medium leading-relaxed text-sm">
                                Your account is secured with role-based access control and JWT session management.
                            </p>
                        </div>
                        <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Auth Level</span>
                                <span className="text-xs font-bold text-indigo-400">Pro Enterprise</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Encryption</span>
                                <span className="text-xs font-bold text-emerald-400">AES-256</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Theme Setting */}
                <div className="fintrack-card p-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                            <Palette className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Appearance</h3>
                            <p className="text-sm text-slate-500 font-medium">Choose how FinTrack looks for you.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-1.5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                        <button
                            onClick={() => setTheme('light')}
                            className={`flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-bold transition-all ${theme === 'light'
                                ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-100'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <Sun className="w-4 h-4" /> Light
                        </button>
                        <button
                            onClick={() => setTheme('dark')}
                            className={`flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-bold transition-all ${theme === 'dark'
                                ? 'bg-slate-800 text-indigo-400 shadow-md'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <Moon className="w-4 h-4" /> Dark
                        </button>
                    </div>
                </div>

                {/* Language Setting */}
                <div className="fintrack-card p-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Language</h3>
                            <p className="text-sm text-slate-500 font-medium">Select your preferred localization.</p>
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
                                className={`flex flex-col items-center gap-2 py-5 rounded-2xl text-[11px] font-black transition-all border-2 ${language === lang.id
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                    : 'bg-white border-slate-50 text-slate-400 hover:border-slate-100 hover:bg-slate-50'
                                    }`}
                            >
                                <span className="text-2xl">{lang.emoji}</span>
                                {lang.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
