import type { JobStatus } from '../../types/job';
import { formatJobStatusLabel } from '../../utils/jobHelpers';

export interface JobStatusBadgeProps {
  jobStatus: JobStatus;
}

/**
 * Returns semantic Tailwind badge colors for open, paused, and closed job statuses.
 */
function getJobStatusClasses(jobStatus: JobStatus): string {
  if (jobStatus === 'open') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }

  if (jobStatus === 'paused') {
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }

  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

/**
 * Pill badge displaying the lifecycle status of a job opening.
 */
export function JobStatusBadge({ jobStatus }: JobStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${getJobStatusClasses(jobStatus)}`}
    >
      {formatJobStatusLabel(jobStatus)}
    </span>
  );
}
