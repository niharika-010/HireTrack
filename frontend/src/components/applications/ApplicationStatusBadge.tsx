import type { HireTrackApplicationStatus } from '../../types/application';
import { formatApplicationStatusName } from '../../utils/applicationHelpers';

export interface ApplicationStatusBadgeProps {
  applicationStatus: HireTrackApplicationStatus;
}

/**
 * Maps each of the 6 application lifecycle statuses to a distinct semantic badge color.
 */
function getApplicationStatusClasses(
  applicationStatus: HireTrackApplicationStatus
): string {
  switch (applicationStatus) {
    case 'applied':
      return 'bg-sky-50 text-sky-700 ring-sky-200';
    case 'under_review':
      return 'bg-amber-50 text-amber-800 ring-amber-200';
    case 'shortlisted':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
    case 'interview_scheduled':
      return 'bg-violet-50 text-violet-700 ring-violet-200';
    case 'selected':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'rejected':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
  }
}

/**
 * Reusable pill badge displaying an application's current hiring status.
 */
export function ApplicationStatusBadge({
  applicationStatus,
}: ApplicationStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${getApplicationStatusClasses(applicationStatus)}`}
    >
      {formatApplicationStatusName(applicationStatus)}
    </span>
  );
}
