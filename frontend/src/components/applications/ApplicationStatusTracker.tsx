import type {
  ApplicationHistoryEntry,
  HireTrackApplicationStatus,
} from '../../types/application';
import {
  APPLICATION_PIPELINE_STEPS,
  formatApplicationStatusName,
  formatDateTime,
} from '../../utils/applicationHelpers';

export interface ApplicationStatusTrackerProps {
  currentStatus: HireTrackApplicationStatus;
  history: ApplicationHistoryEntry[];
}

/**
 * Candidate status tracking interface displaying visual progress across hiring stages
 * along with the chronological audit trail of status updates.
 */
export function ApplicationStatusTracker({
  currentStatus,
  history,
}: ApplicationStatusTrackerProps) {
  const isRejected = currentStatus === 'rejected';
  const currentStepIndex = APPLICATION_PIPELINE_STEPS.indexOf(currentStatus);

  // If the application was rejected, find the highest non-rejected stage it reached from history.
  const highestReachedIndex = isRejected
    ? history.reduce((maxIndex, entry) => {
        const entryIndex = APPLICATION_PIPELINE_STEPS.indexOf(entry.newStatus);
        return entryIndex > maxIndex ? entryIndex : maxIndex;
      }, 0)
    : currentStepIndex;

  return (
    <div className="space-y-6">
      {/* Visual pipeline progress bar */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">
            Application Progress
          </h3>
          {isRejected && (
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
              Application Not Selected
            </span>
          )}
        </div>

        <ol className="mt-5 grid gap-3 sm:grid-cols-5">
          {APPLICATION_PIPELINE_STEPS.map((stage, index) => {
            const isCompleted = index < highestReachedIndex;
            const isCurrent = !isRejected && index === currentStepIndex;

            const cardClasses = isCurrent
              ? 'border-indigo-500 bg-indigo-50/70 text-indigo-900'
              : isCompleted
                ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900'
                : 'border-slate-200 bg-slate-50 text-slate-500';

            const dotClasses = isCurrent
              ? 'bg-indigo-600 text-white'
              : isCompleted
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 text-slate-600';

            return (
              <li
                key={stage}
                className={`rounded-lg border p-3 transition ${cardClasses}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${dotClasses}`}
                  >
                    {isCompleted ? '✓' : index + 1}
                  </span>
                  <span className="text-xs font-semibold leading-tight">
                    {formatApplicationStatusName(stage)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Chronological status history timeline */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-base font-semibold text-slate-900">
          Application History
        </h3>

        {history.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No history events recorded yet.
          </p>
        ) : (
          <ol className="mt-4 space-y-4 border-l-2 border-slate-200 pl-4">
            {history.map((entry) => (
              <li key={entry.historyId} className="relative">
                <span
                  className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-600 ring-4 ring-white"
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {entry.previousStatus
                      ? `${formatApplicationStatusName(entry.previousStatus)} → ${formatApplicationStatusName(entry.newStatus)}`
                      : formatApplicationStatusName(entry.newStatus)}
                  </p>
                  <time className="text-xs text-slate-500">
                    {formatDateTime(entry.changedAt)}
                  </time>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Updated by {entry.changedByName} ({entry.changedByRole})
                </p>
                {entry.statusNote && (
                  <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {entry.statusNote}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
