import React, { useState, useEffect } from 'react';
import { Workspace } from '../types';
import { financeApi } from '../apiClient';
import { useLanguage } from '../context/LanguageContext';

interface WorkspaceManagerProps {
    onSelect: (workspace: Workspace) => void;
    selectedWorkspace?: Workspace;
}

const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({ onSelect, selectedWorkspace }) => {
    const { t } = useLanguage();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWorkspaces = async () => {
        setIsLoading(true);
        try {
            const response = await financeApi.getWorkspaces();
            setWorkspaces(response.data);
        } catch (err) {
            console.error("Failed to fetch workspaces", err);
            setError(t('failed_fetch_workspaces'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkspaces();
    }, []);

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWorkspaceName.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            const slug = newWorkspaceName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
            const response = await financeApi.createWorkspace({ name: newWorkspaceName, slug });
            setWorkspaces([...workspaces, response.data]);
            setNewWorkspaceName('');
        } catch (err: any) {
            setError(err.response?.data?.detail || t('failed_create_workspace'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteWorkspace = async (id: number) => {
        if (!window.confirm(t('confirm_delete_workspace'))) return;

        try {
            await financeApi.deleteWorkspace(id);
            setWorkspaces(workspaces.filter(w => w.id !== id));
        } catch (err) {
            setError(t('failed_delete_workspace'));
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('workspaces')}</h2>
                    <p className="text-slate-500 font-medium">{t('manage_workspaces_desc')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Create Card */}
                <div className="bg-white p-8 rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-blue-500 transition-all group">
                    <form onSubmit={handleCreateWorkspace} className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800">{t('create_new_workspace')}</h3>
                        <input
                            type="text"
                            placeholder={t('workspace_name_placeholder')}
                            value={newWorkspaceName}
                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !newWorkspaceName.trim()}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50"
                        >
                            {t('add_workspace')}
                        </button>
                    </form>
                </div>

                {/* Workspace Cards */}
                {workspaces.map((workspace) => (
                    <div
                        key={workspace.id}
                        className={`
              relative p-8 rounded-[2rem] border-2 transition-all cursor-pointer group
              ${selectedWorkspace?.id === workspace.id
                                ? 'bg-blue-600 border-blue-600 text-white shadow-2xl shadow-blue-200'
                                : 'bg-white border-slate-100 hover:border-blue-200 text-slate-900'}
            `}
                        onClick={() => onSelect(workspace)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-4xl">🏢</div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteWorkspace(workspace.id); }}
                                className={`p-2 rounded-xl transition-all ${selectedWorkspace?.id === workspace.id ? 'hover:bg-white/20 text-white' : 'hover:bg-red-50 text-slate-300 hover:text-red-500'}`}
                            >
                                🗑️
                            </button>
                        </div>
                        <h3 className="text-xl font-black tracking-tight">{workspace.name}</h3>
                        <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${selectedWorkspace?.id === workspace.id ? 'text-blue-100' : 'text-slate-400'}`}>
                            /{workspace.slug}
                        </p>
                        <div className={`mt-6 pt-6 border-t ${selectedWorkspace?.id === workspace.id ? 'border-white/10' : 'border-slate-50'}`}>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full animate-pulse ${selectedWorkspace?.id === workspace.id ? 'bg-white' : 'bg-blue-500'}`}></span>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{t('active_environment')}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 italic">
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
};

export default WorkspaceManager;
