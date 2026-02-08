import React, { useState, useEffect } from 'react';
import { Workspace, ExpenseForm, ExpenseEntry } from '../types';
import { financeApi } from '../api';

interface CustomExpenseEntryProps {
    workspace: Workspace;
    role?: string;
    onAdd?: () => void;
}

const CustomExpenseEntry: React.FC<CustomExpenseEntryProps> = ({ workspace, role, onAdd }) => {
    const [forms, setForms] = useState<ExpenseForm[]>([]);
    const [selectedForm, setSelectedForm] = useState<ExpenseForm | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [entries, setEntries] = useState<ExpenseEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchForms = async () => {
            try {
                const response = await financeApi.getForms(workspace.id);
                setForms(response.data);
            } catch (err) {
                console.error("Failed to fetch forms", err);
            }
        };
        fetchForms();
    }, [workspace.id]);

    useEffect(() => {
        if (selectedForm) {
            const fetchEntries = async () => {
                try {
                    const response = await financeApi.getEntries(selectedForm.id);
                    setEntries(response.data);
                } catch (err: any) {
                    if (err.response?.data?.detail) {
                        setError(err.response.data.detail);
                    } else if (err.response?.status === 403) {
                        setError('Votre compte est en attente d\'approbation par un administrateur.');
                    } else {
                        setError('Erreur lors de l\'enregistrement de la dépense.');
                    }
                    console.error(err);
                }
            };
            fetchEntries();
            // Initialize form data with empty values
            const initial: Record<string, any> = {};
            selectedForm.fields.forEach(f => initial[f.id] = '');
            setFormData(initial);
        }
    }, [selectedForm]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedForm) return;

        if (!navigator.onLine) {
            setError('Vous êtes hors ligne. Veuillez vous connecter à Internet pour enregistrer une entrée.');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const response = await financeApi.createEntry({
                form_id: selectedForm.id,
                workspace_id: workspace.id,
                data: formData
            });
            setEntries([response.data, ...entries]);
            if (onAdd) onAdd();
            // Reset form
            const initial: Record<string, any> = {};
            selectedForm.fields.forEach(f => initial[f.id] = '');
            setFormData(initial);
        } catch (err: any) {
            if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else if (err.response?.status === 403) {
                setError('Votre compte est en attente d\'approbation par un administrateur.');
            } else {
                setError('Erreur lors de l\'enregistrement de l\'entrée.');
            }
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteEntry = async (id: number) => {
        if (!window.confirm('Supprimer cette entrée ?')) return;
        try {
            await financeApi.deleteEntry(id);
            setEntries(entries.filter(e => e.id !== id));
        } catch (err) {
            console.error("Failed to delete entry", err);
            alert("Erreur lors de la suppression.");
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Dynamic Expenses</h2>
                    <p className="text-slate-500 font-medium">Select a form to begin entry</p>
                </div>

                <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl overflow-x-auto max-w-full">
                    {forms.map(form => (
                        <button
                            key={form.id}
                            onClick={() => setSelectedForm(form)}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedForm?.id === form.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            {form.name}
                        </button>
                    ))}
                </div>
            </div>

            {selectedForm ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Submission Form */}
                    <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-100 border border-slate-50 space-y-8">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-800">New {selectedForm.name}</h3>
                            <p className="text-xs text-slate-400 font-semibold">{selectedForm.description}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {selectedForm.fields.map(field => (
                                <div key={field.id} className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>

                                    {field.field_type === 'select' ? (
                                        <select
                                            required={field.required}
                                            value={formData[field.id] || ''}
                                            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
                                        >
                                            <option value="">Select option</option>
                                            {field.options?.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type={field.field_type}
                                            required={field.required}
                                            value={formData[field.id] || ''}
                                            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
                                        />
                                    )}
                                </div>
                            ))}

                            {error && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100">{error}</div>}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                            >
                                {isLoading ? "Submitting..." : "Save Entry"}
                            </button>
                        </form>
                    </div>

                    {/* Entries List */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-black text-slate-800 ml-2 uppercase tracking-widest">Recent Entries</h3>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {entries.length === 0 ? (
                                <div className="p-12 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                                    <span className="text-4xl block mb-4">📭</span>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">No entries yet</p>
                                </div>
                            ) : (
                                entries.map(entry => (
                                    <div key={entry.id} className="p-6 bg-white border border-slate-100 rounded-3xl hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                                                {new Date(entry.created_at).toLocaleDateString()}
                                            </div>
                                            {role === 'ADMIN' && (
                                                <button
                                                    onClick={() => handleDeleteEntry(entry.id)}
                                                    className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
                                                >
                                                    Supprimer
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {selectedForm.fields.map(field => (
                                                <div key={field.id}>
                                                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{field.label}</div>
                                                    <div className="text-sm font-bold text-slate-700">{entry.data[field.id] || '-'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-24 text-center bg-white rounded-[4rem] border border-slate-100 shadow-sm border-dashed">
                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-8">
                        <span className="text-4xl text-blue-400">📝</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">Configure Your Flow</h3>
                    <p className="text-slate-400 font-medium max-w-xs mx-auto">Select one of your custom expense forms from the list above to start logging data.</p>
                </div>
            )}
        </div>
    );
};

export default CustomExpenseEntry;
