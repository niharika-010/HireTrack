import type { ReactNode } from 'react';

export type StatCardAccent = 'indigo' | 'emerald' | 'amber' | 'slate';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  badgeText?: string;
  accent?: StatCardAccent;
  icon?: ReactNode;
}

/**
 * Returns icon container color classes matching the requested card accent.
 */
function getIconAccentClasses(accent: StatCardAccent): string {
  if (accent === 'emerald') {
    return 'bg-emerald-50 text-emerald-600';
  }

  if (accent === 'amber') {
    return 'bg-amber-50 text-amber-600';
  }

  if (accent === 'slate') {
    return 'bg-slate-100 text-slate-600';
  }

  return 'bg-indigo-50 text-indigo-600';
}

/**
 * Reusable SaaS KPI / metric card used across the Admin, Recruiter, and Candidate dashboards.
 */
export function StatCard({
  title,
  value,
  subtitle,
  badgeText,
  accent = 'indigo',
  icon,
}: StatCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        {icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getIconAccentClasses(accent)}`}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-500">{subtitle}</p>
        {badgeText && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {badgeText}
          </span>
        )}
      </div>
    </article>
  );
}
