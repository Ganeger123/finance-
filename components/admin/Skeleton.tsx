import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={'animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ' + className} aria-hidden />
);

export const StatCardSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
      <Skeleton className="w-12 h-12 rounded-xl" />
    </div>
  </div>
);

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <tr className="border-b border-slate-200 dark:border-slate-700">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="py-3.5 px-4">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);
