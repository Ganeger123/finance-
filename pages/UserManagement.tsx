import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { adminApi } from '../apiClient';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Users, Shield, Key, Trash2, Edit2, Search, Loader2, Check, X } from 'lucide-react';
import Modal from '../components/Modal';

const StatusBadge: React.FC<{ lastSeen?: string }> = ({ lastSeen }) => {
    if (!lastSeen) return <span className="text-slate-300 font-bold text-[10px] uppercase tracking-widest italic">Never</span>;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diff = (now.getTime() - lastSeenDate.getTime()) / 1000 / 60;
    const isOnline = diff < 5;

    return (
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></span>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                {isOnline ? 'Online' : 'Offline'}
            </span>
        </div>
    );
};

const UserManagement: React.FC = () => {
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();

    // Modal States
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [resettingPasswordUser, setResettingPasswordUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const response = await adminApi.getUsers();
            setUsers(response.data.users || []);
        } catch (err: any) {
            console.error(err);
            addToast('error', 'Failed to load users');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleApproveUser = async (userId: number) => {
        try {
            setIsSubmitting(true);
            await adminApi.approveUser(userId);
            addToast('success', 'User approved successfully');
            fetchUsers();
        } catch (err) {
            addToast('error', 'Failed to approve user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRejectUser = async (userId: number) => {
        if (!window.confirm('Are you sure you want to reject this user?')) return;
        try {
            setIsSubmitting(true);
            await adminApi.rejectUser(userId);
            addToast('success', 'User rejected');
            fetchUsers();
        } catch (err) {
            addToast('error', 'Failed to reject user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            setIsSubmitting(true);
            await adminApi.deleteUser(userId);
            addToast('success', 'User deleted successfully');
            fetchUsers();
        } catch (err) {
            addToast('error', 'Failed to delete user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async () => {
        if (!resettingPasswordUser || !newPassword) return;
        try {
            setIsSubmitting(true);
            await adminApi.resetPassword(resettingPasswordUser.id as any, newPassword);
            addToast('success', 'Password reset successfully');
            setResettingPasswordUser(null);
            setNewPassword('');
            fetchUsers();
        } catch (err) {
            addToast('error', 'Failed to reset password');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] mb-3 border border-slate-200">
                        Administration
                    </div>
                    <h2 className="text-4xl font-black text-slate-800 tracking-tighter">User Directory</h2>
                    <p className="text-slate-500 font-medium mt-1">Manage system access, roles, and security credentials.</p>
                </div>

                <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex-1 md:max-w-md">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm font-semibold text-slate-700 flex-1"
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full py-20 flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Synchronizing Directory...</p>
                    </div>
                ) : filteredUsers.map(user => (
                    <div key={user.id} className="fintrack-card p-8 group hover:border-indigo-200 transition-all">
                        <div className="flex items-start justify-between mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                <span className="text-xl font-bold text-indigo-600">{user.full_name?.[0] || user.email[0].toUpperCase()}</span>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                {user.status === 'pending' ? (
                                    <>
                                        <button 
                                            onClick={() => handleApproveUser(user.id as any)}
                                            disabled={isSubmitting}
                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all disabled:opacity-50"
                                        >
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        </button>
                                        <button 
                                            onClick={() => handleRejectUser(user.id as any)}
                                            disabled={isSubmitting}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all disabled:opacity-50"
                                        >
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => setResettingPasswordUser(user)}
                                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all"
                                        >
                                            <Key className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteUser(user.id as any)}
                                            disabled={isSubmitting}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all disabled:opacity-50"
                                        >
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1 mb-6">
                            <h4 className="font-black text-slate-800 tracking-tight">{user.full_name || 'System User'}</h4>
                            <p className="text-xs text-slate-400 font-bold truncate">{user.email}</p>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                            <div className="flex items-center gap-2">
                                <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {user.role}
                                </div>
                                <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${user.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {user.status}
                                </div>
                            </div>
                            <StatusBadge lastSeen={(user as any).last_seen} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Modals */}
            <Modal isOpen={!!resettingPasswordUser} onClose={() => setResettingPasswordUser(null)} title={`Reset Password - ${resettingPasswordUser?.email}`}>
                <div className="space-y-6 p-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handleResetPassword}
                            disabled={!newPassword || isSubmitting}
                            className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                            Reset Password
                        </button>
                        <button
                            onClick={() => setResettingPasswordUser(null)}
                            className="flex-1 bg-slate-200 text-slate-800 font-bold py-2 rounded-lg hover:bg-slate-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default UserManagement;
