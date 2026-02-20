import React from 'react';

type BadgeVariant = 'success' | 'error' | 'warning' | 'neutral' | 'info';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  error: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  info: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  neutral: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, variant = 'neutral', className = '' }) => {
  return (
    <span
      className={
        'inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold ' +
        variantStyles[variant] +
        ' ' +
        className
      }
    >
      {label}
    </span>
  );
};
