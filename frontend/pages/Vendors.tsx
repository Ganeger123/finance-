import React, { useState, useEffect } from 'react';
import { financeApi } from '../apiClient';
import { User } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface VendorsProps {
    user: User | null;
}

const Vendors: React.FC<VendorsProps> = ({ user }) => {
    const { t } = useLanguage();
    const [vendors, setVendors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        commission_rate: 0
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            const response = await financeApi.getVendors();
            setVendors(response.data);
        } catch (err) {
            console.error("Failed to fetch vendors", err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.name) {
            setError(t('name_required'));
            return;
        }

        setIsLoading(true);
        try {
            await financeApi.createVendor(formData);
            setSuccess(t('vendor_created'));
            setFormData({ name: '', description: '', commission_rate: 0 });
            setShowForm(false);
            fetchVendors();
        } catch (err: any) {
            setError(err.response?.data?.detail || t('vendor_create_failed'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm(t('confirm_delete_vendor'))) return;
        try {
            await financeApi.deleteVendor(id);
            setVendors(vendors.filter(v => v.id !== id));
        } catch (err) {
            console.error("Failed to delete vendor", err);
            alert("Failed to delete vendor");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('vendors')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">{t('manage_vendors_desc')}</p>
                </div>
                {user?.role === 'ADMIN' && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95"
                    >
                        {showForm ? t('cancel') : `+ ${t('add_vendor')}`}
                    </button>
                )}
            </header>

            {showForm && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-4">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">{t('new_vendor')}</h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">{t('name')}</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900 dark:text-white"
                                    placeholder={t('vendor_name_placeholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">{t('commission_rate')}</label>
                                <input
                                    type="number"
                                    value={formData.commission_rate}
                                    onChange={e => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900 dark:text-white"
                                    placeholder="0.0"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">{t('description')}</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none font-medium text-slate-900 dark:text-white resize-none h-24"
                                placeholder={t('description_placeholder')}
                            />
                        </div>

                        {error && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl">{error}</div>}
                        {success && <div className="p-4 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl">{success}</div>}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black rounded-xl transition-all active:scale-[0.98]"
                        >
                            {isLoading ? t('saving') : t('create_vendor_btn')}
                        </button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vendors.map(vendor => (
                    <div key={vendor.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-2xl">
                                🏪
                            </div>
                            {user?.role === 'ADMIN' && (
                                <button
                                    onClick={() => handleDelete(vendor.id)}
                                    className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-black uppercase tracking-widest"
                                >
                                    {t('delete')}
                                </button>
                            )}
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">{vendor.name}</h3>
                        <p className="text-sm text-slate-400 font-medium mb-6 line-clamp-2 min-h-[2.5em]">{vendor.description || 'No description'}</p>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('rate')}</span>
                                <span className="font-black text-slate-700 dark:text-slate-200">{vendor.commission_rate}%</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('total_paid')}</span>
                                <span className="font-black text-emerald-500">{vendor.total_commission_paid.toLocaleString()} HTG</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {vendors.length === 0 && !isLoading && (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700">
                    <div className="text-4xl mb-4">📭</div>
                    <p className="text-slate-400 font-bold">{t('no_vendors')}</p>
                </div>
            )}
        </div>
    );
};

export default Vendors;
