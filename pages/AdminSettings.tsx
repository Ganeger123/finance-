import React, { useState, useEffect } from 'react';
import { adminApi } from '../apiClient';
import { useTheme } from '../context/ThemeContext';

export default function AdminSettings() {
  const { theme } = useTheme();
  const [settings, setSettings] = useState<{ email_alerts_enabled?: string; password_min_length?: string; ADMIN_EMAIL?: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getSettings()
      .then((res) => setSettings(res.data || {}))
      .catch((e: { response?: { data?: { detail?: string } } }) => setError(e.response?.data?.detail || 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await adminApi.updateSettings({
        email_alerts_enabled: settings.email_alerts_enabled,
        password_min_length: settings.password_min_length,
        ADMIN_EMAIL: settings.ADMIN_EMAIL,
      });
      setMessage('Settings saved.');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const isDark = theme === 'dark';

  if (loading) {
    return <div className="p-6 text-slate-500">Loading settings…</div>;
  }

  return (
    <div className={`rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'} shadow-sm p-6 max-w-2xl`}>
      <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Admin Settings</h1>

      {message && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Email alerts to admin
          </label>
          <select
            value={settings.email_alerts_enabled ?? 'true'}
            onChange={(e) => setSettings((s) => ({ ...s, email_alerts_enabled: e.target.value }))}
            className={`w-full rounded-xl border px-4 py-2 ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
          <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Notify admin on login, password reset/change, form submissions, and multiple failed logins.
          </p>
        </div>

        <div>
          <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Password minimum length
          </label>
          <input
            type="number"
            min={6}
            max={32}
            value={settings.password_min_length ?? '8'}
            onChange={(e) => setSettings((s) => ({ ...s, password_min_length: e.target.value }))}
            className={`w-full rounded-xl border px-4 py-2 ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
          />
        </div>

        <div>
          <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Admin email (for alerts)
          </label>
          <input
            type="email"
            value={settings.ADMIN_EMAIL ?? ''}
            onChange={(e) => setSettings((s) => ({ ...s, ADMIN_EMAIL: e.target.value }))}
            placeholder="admin@example.com"
            className={`w-full rounded-xl border px-4 py-2 ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
