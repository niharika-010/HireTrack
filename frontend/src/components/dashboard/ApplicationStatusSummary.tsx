import { ApplicationStatusBadge } from '../applications/ApplicationStatusBadge';
import type { StatusCountItem } from '../../types/dashboard';

export interface ApplicationStatusSummaryProps {
  title?: string;
  items: StatusCountItem[];
}

/**
 * Displays live PostgreSQL counts for all 6 official application lifecycle statuses.
 */
export function ApplicationStatusSummary({
  title = 'Application Status Summary',
  items,
}: ApplicationStatusSummaryProps) {
  const totalApplications = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <span className="text-xs font-medium text-slate-500">
          {totalApplications} total application
          {totalApplications === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const sharePercent =
            totalApplications > 0
              ? Math.round((item.count / totalApplications) * 100)
              : 0;

          return (
            <div
              key={item.status}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-3"
            >
              <ApplicationStatusBadge applicationStatus={item.status} />
              <div className="text-right">
                <p className="text-lg font-bold leading-tight text-slate-900">
                  {item.count}
                </p>
                <p className="text-[11px] text-slate-500">{sharePercent}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
