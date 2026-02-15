import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { adminApi } from '../../apiClient';
import { FormInput } from '../../components/admin/FormInput';
import { useToast } from '../../context/ToastContext';
import { Skeleton } from '../../components/admin/Skeleton';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<{
    email_alerts_enabled?: string;
    password_min_length?: string;
    ADMIN_EMAIL?: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    adminApi
      .getSettings()
      .then((res) => setSettings(res.data || {}))
      .catch(() => addToast('error', 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateSettings({
        email_alerts_enabled: settings.email_alerts_enabled,
        password_min_length: settings.password_min_length,
        ADMIN_EMAIL: settings.ADMIN_EMAIL,
      });
      addToast('success', 'Settings saved');
    } catch {
      addToast('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          System preferences, security, and notifications
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">System Preferences</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Email alerts to admin
          </label>
          <select
            value={settings.email_alerts_enabled ?? 'true'}
            onChange={(e) => setSettings((s) => ({ ...s, email_alerts_enabled: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Notify admin on login, password changes, form submissions, and failed logins.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Security Settings</h2>
        <FormInput
          label="Password minimum length"
          type="number"
          min={6}
          max={32}
          value={settings.password_min_length ?? '8'}
          onChange={(e) => setSettings((s) => ({ ...s, password_min_length: e.target.value }))}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Admin Profile</h2>
        <FormInput
          label="Admin email (for alerts)"
          type="email"
          value={settings.ADMIN_EMAIL ?? ''}
          onChange={(e) => setSettings((s) => ({ ...s, ADMIN_EMAIL: e.target.value }))}
          placeholder="admin@example.com"
        />
      </section>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
