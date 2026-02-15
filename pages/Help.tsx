import React, { useState } from 'react';
import { supportApi } from '../apiClient';

const Help: React.FC = () => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    setSent(false);
    try {
      await supportApi.createTicket(message.trim());
      setSent(true);
      setMessage('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Envoi impossible. Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Aide</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">FAQ et contact support</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 space-y-6">
          <h3 className="text-xl font-black text-slate-800 dark:text-white">Questions fréquentes</h3>
          <ul className="space-y-4 text-slate-600 dark:text-slate-300 text-sm">
            <li>
              <strong className="text-slate-800 dark:text-white">Comment créer un espace de travail ?</strong>
              <br />
              Allez dans Espaces de travail, puis « Créer un espace » et donnez un nom.
            </li>
            <li>
              <strong className="text-slate-800 dark:text-white">Comment ajouter un formulaire de dépenses ?</strong>
              <br />
              Sélectionnez un espace, puis « Form Builder » pour créer un formulaire personnalisé avec champs dynamiques.
            </li>
            <li>
              <strong className="text-slate-800 dark:text-white">Où voir mes notifications ?</strong>
              <br />
              Utilisez le menu « Notifications » pour voir votre activité récente (connexions, formulaires envoyés, etc.).
            </li>
            <li>
              <strong className="text-slate-800 dark:text-white">Mon compte est en attente, que faire ?</strong>
              <br />
              Un administrateur doit approuver votre compte. Vous pouvez nous contacter via le formulaire ci-contre.
            </li>
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 space-y-6">
          <h3 className="text-xl font-black text-slate-800 dark:text-white">Contacter le support</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Décrivez votre demande ou problème. Un administrateur vous répondra par email.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Votre message..."
              rows={5}
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-medium resize-y"
              required
            />
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
            {sent && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-medium">
                Message envoyé. Nous vous répondrons bientôt.
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50"
            >
              {loading ? 'Envoi...' : 'Envoyer'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Help;
