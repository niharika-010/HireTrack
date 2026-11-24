import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description: string;
  badgeText?: string;
  action?: ReactNode;
}

/**
 * Reusable empty-state panel shown when a module has no records yet or belongs to an upcoming phase.
 */
export function EmptyState({
  title,
  description,
  badgeText,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-xs ring-1 ring-slate-200"
        aria-hidden="true"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.6}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      </div>

      {badgeText && (
        <span className="mt-3 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
          {badgeText}
        </span>
      )}

      <h3 className="mt-3 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
