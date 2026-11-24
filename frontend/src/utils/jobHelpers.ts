import type { EmploymentType, JobStatus } from '../types/job';

/**
 * Converts an employment type code into a readable UI label.
 */
export function formatEmploymentTypeLabel(
  employmentType: EmploymentType
): string {
  const labels: Record<EmploymentType, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Contract',
    internship: 'Internship',
  };

  return labels[employmentType];
}

/**
 * Converts a job status code into a readable UI label.
 */
export function formatJobStatusLabel(jobStatus: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    open: 'Open',
    paused: 'Paused',
    closed: 'Closed',
  };

  return labels[jobStatus];
}

/**
 * Formats optional minimum and maximum salary integers into a readable range string.
 */
export function formatSalaryRange(
  salaryMin: number | null,
  salaryMax: number | null
): string {
  if (salaryMin === null && salaryMax === null) {
    return 'Compensation not specified';
  }

  const formatNumber = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);

  if (salaryMin !== null && salaryMax !== null) {
    return `${formatNumber(salaryMin)} – ${formatNumber(salaryMax)}`;
  }

  if (salaryMin !== null) {
    return `From ${formatNumber(salaryMin)}`;
  }

  return `Up to ${formatNumber(salaryMax as number)}`;
}

/**
 * Formats an ISO-8601 timestamp returned by PostgreSQL into a short readable date.
 */
export function formatShortDate(isoTimestamp: string): string {
  const parsedDate = new Date(isoTimestamp);
  if (Number.isNaN(parsedDate.getTime())) {
    return isoTimestamp;
  }

  return parsedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
