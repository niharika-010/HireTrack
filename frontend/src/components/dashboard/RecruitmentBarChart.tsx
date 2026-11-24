export interface BarChartDatum {
  label: string;
  count: number;
  barColorClass?: string;
}

export interface RecruitmentBarChartProps {
  title: string;
  subtitle: string;
  items: BarChartDatum[];
  emptyMessage: string;
}

/**
 * Reusable SaaS recruitment bar chart rendering real PostgreSQL counts with proportional progress bars.
 */
export function RecruitmentBarChart({
  title,
  subtitle,
  items,
  emptyMessage,
}: RecruitmentBarChartProps) {
  const totalCount = items.reduce((sum, item) => sum + item.count, 0);
  const maxValue = Math.max(...items.map((item) => item.count), 1);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
          Total: {totalCount}
        </span>
      </div>

      {items.length === 0 || totalCount === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-5 space-y-3.5">
          {items.map((item) => {
            const widthPercent = Math.round((item.count / maxValue) * 100);
            const sharePercent = Math.round((item.count / totalCount) * 100);

            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-slate-700">
                    {item.label}
                  </span>
                  <span className="shrink-0 font-semibold text-slate-900">
                    {item.count}{' '}
                    <span className="font-normal text-slate-500">
                      ({sharePercent}%)
                    </span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      item.barColorClass ?? 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.max(widthPercent, item.count > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
