import React from 'react';

interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  error?: string;
  hint?: string;
}

export const FormInput: React.FC<FormInputProps> = ({ label, error, hint, id, ...props }) => {
  const inputId = id || `input-${label.replace(/\s/g, '-').toLowerCase()}`;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={`
          w-full rounded-xl border px-4 py-2.5 text-sm font-medium
          bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600
          text-slate-900 dark:text-white placeholder-slate-400
          focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all
          disabled:opacity-50
          ${error ? 'border-red-500 dark:border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''}
        `}
        {...props}
      />
      {error && <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
};
