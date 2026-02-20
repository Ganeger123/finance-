import React, { useState, useEffect } from 'react';
import { ExpenseCategory, Workspace } from '../types';
import { financeApi } from '../apiClient';
import { useToast } from '../context/ToastContext';
import { Loader2, Check } from 'lucide-react';

interface TransactionFormProps {
    type: 'EXPENSE' | 'INCOME';
    onSuccess: () => void;
    selectedWorkspace?: Workspace;
    initialData?: any;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
    type,
    onSuccess,
    selectedWorkspace,
    initialData
}) => {
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        category: initialData?.category || (type === 'EXPENSE' ? ExpenseCategory.SALAIRE_FIXE : 'FORMATION'),
        amount: initialData?.amount ? String(initialData.amount) : '',
        comment: initialData?.comment || '',
        date: initialData?.date || new Date().toISOString().split('T')[0],
        studentCount: initialData?.studentCount ? String(initialData.studentCount) : '1',
        unitPrice: initialData?.unitPrice ? String(initialData.unitPrice) : '1000'
    });

    const [customCategory, setCustomCategory] = useState('');

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await financeApi.getCategories();
                const base = type === 'EXPENSE' ? Object.values(ExpenseCategory) : ['FORMATION', 'VENTE', 'SERVICE', 'AUTRE'];
                const merged = Array.from(new Set([...base, ...res.data]));
                setAvailableCategories(merged);
            } catch (err) {
                console.error("Failed to fetch categories", err);
            }
        };
        fetchCategories();
    }, [type]);

    useEffect(() => {
        if (type === 'INCOME' && !initialData?.amount) {
            const count = parseInt(formData.studentCount) || 0;
            const price = parseFloat(formData.unitPrice) || 0;
            setFormData(prev => ({ ...prev, amount: String(count * price) }));
        }
    }, [formData.studentCount, formData.unitPrice, type, initialData?.amount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(formData.amount);

        if (isNaN(amt) || amt <= 0) {
            addToast('error', 'Please enter a valid amount');
            return;
        }

        let finalCategory = formData.category;
        if (formData.category === "OTHER" || formData.category === "AUTRE") {
            if (!customCategory.trim()) {
                addToast('error', 'Please specify a category name');
                return;
            }
            finalCategory = customCategory.trim();
        }

        setIsLoading(true);
        try {
            const payload = {
                category: finalCategory,
                type: finalCategory,
                amount: amt,
                comment: formData.comment,
                date: formData.date,
                workspace_id: selectedWorkspace?.id,
                student_count: type === 'INCOME' ? parseInt(formData.studentCount) : undefined,
                subtype: type === 'INCOME' ? finalCategory : undefined
            };

            if (initialData?.id) {
                if (type === 'EXPENSE') await financeApi.updateExpense(initialData.id, payload);
                // else await financeApi.updateIncome(initialData.id, payload);
                addToast('success', 'Updated successfully');
            } else {
                if (type === 'EXPENSE') await financeApi.createExpense(payload);
                else await financeApi.createIncome({
                    ...payload,
                    type: finalCategory,
                    subtype: finalCategory === 'AUTRE' ? null : finalCategory
                });
                addToast('success', `${type === 'EXPENSE' ? 'Expense' : 'Income'} recorded!`);
            }

            onSuccess();
        } catch (err: any) {
            addToast('error', err.response?.data?.detail || 'Operation failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Category / Type</label>
                <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none transition-all font-bold text-slate-700 appearance-none"
                >
                    {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="OTHER">➕ Other / Custom</option>
                </select>

                {formData.category === "OTHER" && (
                    <input
                        type="text"
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        placeholder="Type category name..."
                        className="w-full px-5 py-4 mt-2 bg-indigo-50/30 border border-indigo-100 rounded-2xl outline-none font-bold text-slate-800 animate-in slide-in-from-top-2"
                    />
                )}
            </div>

            {type === 'INCOME' && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Student Count</label>
                        <input
                            type="number"
                            min="1"
                            value={formData.studentCount}
                            onChange={e => setFormData({ ...formData, studentCount: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none transition-all font-bold text-slate-800"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Unit Price</label>
                        <input
                            type="number"
                            value={formData.unitPrice}
                            onChange={e => setFormData({ ...formData, unitPrice: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none transition-all font-bold text-slate-800"
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Total (HTG)</label>
                    <input
                        type="number"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        readOnly={type === 'INCOME'}
                        className={`w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none transition-all font-black text-slate-800 ${type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : ''}`}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Date</label>
                    <input
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none transition-all font-bold text-slate-700"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Notes</label>
                <textarea
                    rows={3}
                    value={formData.comment}
                    onChange={e => setFormData({ ...formData, comment: e.target.value })}
                    placeholder="Optional explanation..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none transition-all resize-none text-sm font-medium"
                />
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 bg-[#374b91] hover:bg-[#202a54] text-white font-black rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-indigo-200 uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Save {type === 'EXPENSE' ? 'Expense' : 'Income'}</>}
            </button>
        </form>
    );
};

export default TransactionForm;
