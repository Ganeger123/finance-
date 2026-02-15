import React, { useState, useEffect } from 'react';
import { notificationsApi } from '../apiClient';

export interface NotificationItem {
  id: number;
  action: string;
  status: string;
  details: string;
  created_at: string;
}

const actionLabels: Record<string, string> = {
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  PASSWORD_CHANGED: 'Mot de passe modifié',
  PASSWORD_RESET: 'Réinitialisation mot de passe',
  FORM_SUBMITTED: 'Formulaire envoyé',
  LOGIN_FAILED: 'Échec de connexion',
};

const Notifications: React.FC = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await notificationsApi.getNotifications({ limit: 50 });
        if (!cancelled) setItems(Array.isArray(res.data) ? res.data : []);
      } catch (err: any) {
        if (!cancelled) setError(err.response?.data?.detail || 'Impossible de charger les notifications.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchNotifications();
    return () => { cancelled = true; };
  }, []);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Il y a ${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `Il y a ${diffDays} j`;
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Notifications</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Votre activité récente</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-800 font-medium">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="bg-white dark:bg-slate-800/50 p-12 rounded-[2rem] border border-slate-100 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400">
          Aucune notification pour le moment.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className="bg-white dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-start gap-4"
            >
              <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                n.status === 'Success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
              }`}>
                {n.status === 'Success' ? '✓' : '!'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 dark:text-white">
                  {actionLabels[n.action] || n.action}
                </p>
                {n.details && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{n.details}</p>}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{formatDate(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
