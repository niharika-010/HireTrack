import type { HireTrackApplicationStatus } from '../types/application';

/**
 * Ordered recruitment pipeline steps shown in the Candidate Status Tracking interface.
 */
export const APPLICATION_PIPELINE_STEPS: HireTrackApplicationStatus[] = [
  'applied',
  'under_review',
  'shortlisted',
  'interview_scheduled',
  'selected',
];

/**
 * All 6 selectable application statuses for recruiter status dropdowns and filters.
 */
export const ALL_APPLICATION_STATUSES: HireTrackApplicationStatus[] = [
  'applied',
  'under_review',
  'shortlisted',
  'interview_scheduled',
  'selected',
  'rejected',
];

/**
 * Converts an application status code into its official display label.
 */
export function formatApplicationStatusName(
  applicationStatus: HireTrackApplicationStatus
): string {
  const labels: Record<HireTrackApplicationStatus, string> = {
    applied: 'Applied',
    under_review: 'Under Review',
    shortlisted: 'Shortlisted',
    interview_scheduled: 'Interview Scheduled',
    selected: 'Selected',
    rejected: 'Rejected',
  };

  return labels[applicationStatus];
}

/**
 * Formats byte counts (e.g. resume file size) into a readable KB or MB string.
 */
export function formatFileSize(fileSizeBytes: number | null): string {
  if (fileSizeBytes === null || fileSizeBytes <= 0) {
    return 'Unknown size';
  }

  if (fileSizeBytes < 1024) {
    return `${fileSizeBytes} B`;
  }

  if (fileSizeBytes < 1024 * 1024) {
    return `${(fileSizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Formats an ISO timestamp into a readable date and time for status history logs.
 */
export function formatDateTime(isoTimestamp: string): string {
  const parsedDate = new Date(isoTimestamp);
  if (Number.isNaN(parsedDate.getTime())) {
    return isoTimestamp;
  }

  return parsedDate.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
