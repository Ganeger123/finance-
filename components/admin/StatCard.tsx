import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  accent?: 'indigo' | 'emerald' | 'amber' | 'red' | 'zinc';
  className?: string;
}

const accentStyles: Record<string, string> = {
  indigo: 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  emerald: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20 text-amber-600 dark:text-amber-400',
  red: 'bg-red-500/10 dark:bg-red-500/20 border-red-500/20 text-red-600 dark:text-red-400',
  zinc: 'bg-zinc-500/10 dark:bg-zinc-500/20 border-zinc-500/20 text-zinc-600 dark:text-zinc-400',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  accent = 'indigo',
  className = '',
}) => {
  const style = accentStyles[accent] || accentStyles.zinc;
  return (
    <div
      className={
        'rounded-2xl border bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 p-6 transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 ' +
        (className || '')
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
          {trend && (
            <p
              className={
                'mt-1 text-xs font-medium ' +
                (trend.value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')
              }
            >
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={'shrink-0 w-12 h-12 rounded-xl border flex items-center justify-center ' + style}>
          <Icon className="w-6 h-6" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
};
