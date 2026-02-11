import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { financeApi } from '../apiClient';
import { useLanguage } from '../context/LanguageContext';

const StatusBadge: React.FC<{ lastSeen?: string }> = ({ lastSeen }) => {
    if (!lastSeen) return <span className="text-slate-300 font-bold text-[10px] uppercase tracking-widest">Never</span>;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diff = (now.getTime() - lastSeenDate.getTime()) / 1000 / 60; // diff in minutes
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
    const [error, setError] = useState<string | null>(null);

    // Modal States
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [resettingPasswordUser, setResettingPasswordUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const response = await financeApi.getUsers();
            setUsers(response.data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to fetch users");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        const interval = setInterval(fetchUsers, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const handleDeleteUser = async (user: User) => {
        if (!window.confirm(`Are you sure you want to remove ${user.full_name || user.email}?`)) return;
        try {
            await financeApi.deleteUser(parseInt(user.id));
            setUsers(users.filter(u => u.id !== user.id));
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to delete user");
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setIsSubmitting(true);
        try {
            const response = await financeApi.updateUser(parseInt(editingUser.id), {
                full_name: editingUser.full_name,
                role: editingUser.role,
                status: editingUser.status
            });
            setUsers(users.map(u => u.id === editingUser.id ? response.data : u));
            setEditingUser(null);
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to update user");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resettingPasswordUser) return;
        setIsSubmitting(true);
        try {
            await financeApi.resetPassword(parseInt(resettingPasswordUser.id), {
                new_password: newPassword
            });
            alert("Password reset successfully and sessions invalidated.");
            setResettingPasswordUser(null);
            setNewPassword('');
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to reset password");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogoutEverywhere = async (user: User) => {
        if (!window.confirm(`Force logout for ${user.full_name || user.email} on all devices?`)) return;
        try {
            await financeApi.logoutEverywhere(parseInt(user.id));
            alert("Sessions invalidated.");
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to force logout");
        }
    };

    const handleApprove = async (user: User) => {
        try {
            await financeApi.approveUser(parseInt(user.id));
            setUsers(users.map(u => u.id === user.id ? { ...u, status: 'APPROVED' } : u));
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to approve user");
        }
    };

    const handleReject = async (user: User) => {
        if (!window.confirm(`Reject user ${user.email}? This will invalidate their sessions.`)) return;
        try {
            await financeApi.rejectUser(parseInt(user.id));
            setUsers(users.map(u => u.id === user.id ? { ...u, status: 'REJECTED' } : u));
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to reject user");
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">User Management</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Manage system access, roles, and security.</p>
                </div>
                <button
                    onClick={fetchUsers}
                    className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all active:scale-95 text-xs font-black uppercase tracking-widest text-slate-500"
                >
                    🔄 Refresh
                </button>
            </header>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 dark:text-white tracking-tight">Connected Accounts</h3>
                    <div className="flex gap-4 items-center">
                        <span className="text-[10px] font-black px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg uppercase tracking-widest">
                            {users.filter(u => {
                                if (!u.last_seen) return false;
                                return (new Date().getTime() - new Date(u.last_seen).getTime()) / 60000 < 5;
                            }).length} Online
                        </span>
                        <span className="text-[10px] font-black px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg uppercase tracking-widest">{users.length} total</span>
                        <span className="text-[10px] font-black px-3 py-1 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg uppercase tracking-widest">
                            {users.filter(u => u.status === 'PENDING').length} Pending
                        </span>
                    </div>
                </div>

                {isLoading && users.length === 0 ? (
                    <div className="p-20 text-center animate-pulse font-black text-slate-300">Loading directory...</div>
                ) : error ? (
                    <div className="p-20 text-center text-red-500 font-bold">{error}</div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 text-[10px] uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-5 font-black">User</th>
                                        <th className="px-8 py-5 font-black">Status</th>
                                        <th className="px-8 py-5 font-black">Role</th>
                                        <th className="px-8 py-5 font-black text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-sm">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="font-black text-slate-800 dark:text-white">{user.full_name || 'Anonymous User'}</div>
                                                <div className="text-[10px] text-slate-400 font-bold">{user.email}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <StatusBadge lastSeen={user.last_seen} />
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'ADMIN'
                                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                                                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                    <span className={`w-fit px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${user.status === 'APPROVED'
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : user.status === 'REJECTED'
                                                            ? 'bg-red-50 text-red-600'
                                                            : 'bg-orange-50 text-orange-600'
                                                        }`}>
                                                        {user.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {user.status === 'PENDING' && (
                                                        <>
                                                            <button onClick={() => handleApprove(user)} className="p-2 text-emerald-500 hover:scale-110 title='Approve' transition-all">✅</button>
                                                            <button onClick={() => handleReject(user)} className="p-2 text-red-500 hover:scale-110 title='Reject' transition-all">❌</button>
                                                        </>
                                                    )}
                                                    <button onClick={() => setEditingUser(user)} className="p-2 text-slate-400 hover:text-blue-500 title='Edit' transition-colors">✏️</button>
                                                    <button onClick={() => setResettingPasswordUser(user)} className="p-2 text-slate-400 hover:text-orange-500 title='Reset Password' transition-colors">🔑</button>
                                                    <button onClick={() => handleLogoutEverywhere(user)} className="p-2 text-slate-400 hover:text-slate-900 title='Force Logout' transition-colors">🚪</button>
                                                    <button onClick={() => handleDeleteUser(user)} className="p-2 text-slate-400 hover:text-red-500 title='Remove' transition-colors">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card Layout */}
                        <div className="md:hidden divide-y divide-slate-50 dark:divide-slate-800">
                            {users.map(user => (
                                <div key={user.id} className="p-6 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{user.full_name || 'Anonymous'}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">{user.email}</div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${user.role === 'ADMIN'
                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <StatusBadge lastSeen={user.last_seen} />
                                        <div className="flex items-center gap-4">
                                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${user.status === 'APPROVED'
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : user.status === 'REJECTED'
                                                    ? 'bg-red-50 text-red-600'
                                                    : 'bg-orange-50 text-orange-600'
                                                }`}>
                                                {user.status}
                                            </span>
                                            <div className="flex gap-1">
                                                {user.status === 'PENDING' && (
                                                    <>
                                                        <button onClick={() => handleApprove(user)} className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-500 active:scale-95 transition-all">✅</button>
                                                        <button onClick={() => handleReject(user)} className="p-2.5 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-500 active:scale-95 transition-all">❌</button>
                                                    </>
                                                )}
                                                <button onClick={() => setEditingUser(user)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 active:scale-95 transition-all">✏️</button>
                                                <button onClick={() => setResettingPasswordUser(user)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 active:scale-95 transition-all">🔑</button>
                                                <button onClick={() => handleLogoutEverywhere(user)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 active:scale-95 transition-all">🚪</button>
                                                <button onClick={() => handleDeleteUser(user)} className="p-2.5 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-500 active:scale-95 transition-all">🗑️</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
                        <header>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Edit Profile</h3>
                            <p className="text-sm text-slate-500 font-medium">Updating {editingUser.email}</p>
                        </header>

                        <form onSubmit={handleUpdateUser} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                <input
                                    type="text"
                                    value={editingUser.full_name || ''}
                                    onChange={e => setEditingUser({ ...editingUser, full_name: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">User Role</label>
                                <select
                                    value={editingUser.role}
                                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as Role })}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold"
                                >
                                    <option value="STANDARD">Standard User</option>
                                    <option value="ADMIN">Administrator</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Status</label>
                                <select
                                    value={editingUser.status}
                                    onChange={e => setEditingUser({ ...editingUser, status: e.target.value as any })}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold"
                                >
                                    <option value="PENDING">Pending Approval</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50">
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Reset Modal */}
            {resettingPasswordUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
                        <header>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight text-orange-600">Reset Password</h3>
                            <p className="text-sm text-slate-500 font-medium">Enter a new password for {resettingPasswordUser.email}</p>
                        </header>

                        <form onSubmit={handleResetPassword} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Minimum 8 characters"
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/10 font-bold"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => { setResettingPasswordUser(null); setNewPassword('') }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50">
                                    {isSubmitting ? 'Updating...' : 'Reset Access'}
                                </button>
                            </div>

                            <p className="text-[10px] font-bold text-center text-slate-400 uppercase tracking-widest leading-relaxed">
                                Note: This will invalidate all active sessions for this user.
                            </p>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
