import React, { useState } from 'react';
import { Workspace, ExpenseForm, ExpenseField } from '../types';
import { financeApi } from '../apiClient';

interface FormBuilderProps {
    workspace: Workspace;
    onFormCreated: (form: ExpenseForm) => void;
}

const FormBuilder: React.FC<FormBuilderProps> = ({ workspace, onFormCreated }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [fields, setFields] = useState<Partial<ExpenseField>[]>([
        { label: '', field_type: 'text', required: true }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addField = () => {
        setFields([...fields, { label: '', field_type: 'text', required: false }]);
    };

    const removeField = (index: number) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const updateField = (index: number, updates: Partial<ExpenseField>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        setFields(newFields);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            const response = await financeApi.createForm({
                workspace_id: workspace.id,
                name,
                description,
                fields: fields.map(f => ({
                    ...f,
                    options: f.field_type === 'select' ? (f as any).optionsRaw?.split(',').map((o: string) => o.trim()) : null
                }))
            });
            onFormCreated(response.data);
            setName('');
            setDescription('');
            setFields([{ label: '', field_type: 'text', required: true }]);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to create form");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 sm:p-12 rounded-[3.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)] space-y-10 animate-in slide-in-from-bottom-8 duration-700">
            <div className="space-y-3">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Expense Form Builder</h2>
                <p className="text-sm font-medium text-slate-400">Environment: <span className="text-blue-600 font-bold">/{workspace.slug}</span></p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Form Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
                            placeholder="e.g., Marketing Expenses"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
                            placeholder="Purpose of this form"
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Dynamic Fields</label>
                        <button
                            type="button"
                            onClick={addField}
                            className="px-4 py-2 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                        >
                            + Add Field
                        </button>
                    </div>

                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={index} className="flex flex-col md:flex-row gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 relative group animate-in zoom-in-95 duration-300">
                                <div className="flex-1 space-y-2">
                                    <input
                                        type="text"
                                        required
                                        placeholder="Field Label (e.g., Project Code)"
                                        value={field.label}
                                        onChange={(e) => updateField(index, { label: e.target.value })}
                                        className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-semibold text-sm"
                                    />
                                </div>
                                <div className="w-full md:w-32">
                                    <select
                                        value={field.field_type}
                                        onChange={(e) => updateField(index, { field_type: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-xs"
                                    >
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="date">Date</option>
                                        <option value="select">Select</option>
                                    </select>
                                </div>

                                {field.field_type === 'select' && (
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Options (comma separated)"
                                            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-semibold text-sm"
                                            onChange={(e) => updateField(index, { optionsRaw: e.target.value } as any)}
                                        />
                                    </div>
                                )}

                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => updateField(index, { required: e.target.checked })}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Required</span>
                                    </label>

                                    {fields.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeField(index)}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {error && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100">{error}</div>}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-5 bg-[#0d1421] hover:bg-slate-800 text-white font-black rounded-2xl transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 text-lg"
                >
                    {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Deploy Custom Form"}
                </button>
            </form>
        </div>
    );
};

export default FormBuilder;
