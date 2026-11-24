import type { ApplicationStatus } from '../types/recruitment';

/**
 * Joins a base API URL and a relative endpoint path without duplicate slashes.
 */
export function buildApiEndpointUrl(baseUrl: string, endpointPath: string): string {
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpointPath = endpointPath.startsWith('/')
    ? endpointPath
    : `/${endpointPath}`;

  return `${cleanBaseUrl}${cleanEndpointPath}`;
}

/**
 * Converts an internal application status value into a readable label for the UI.
 */
export function formatApplicationStatusLabel(applicationStatus: ApplicationStatus): string {
  const statusLabels: Record<ApplicationStatus, string> = {
    applied: 'Applied',
    screening: 'Screening',
    interview: 'Interview',
    offer: 'Offer Extended',
    hired: 'Hired',
    rejected: 'Rejected',
  };

  return statusLabels[applicationStatus];
}
