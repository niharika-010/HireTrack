import type {
  CreateJobPayload,
  JobFilterParams,
  JobListResponse,
  SingleJobResponse,
  UpdateJobPayload,
} from '../types/job';
import { buildApiEndpointUrl } from '../utils/formatters';

interface JobApiErrorPayload {
  error?: string;
  message?: string;
}

/**
 * Extracts a clear error message from a failed job API HTTP response.
 */
async function extractJobApiError(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  try {
    const errorPayload = (await response.json()) as JobApiErrorPayload;
    if (errorPayload.error) {
      return errorPayload.error;
    }
    if (errorPayload.message) {
      return errorPayload.message;
    }
  } catch {
    // Fall back to default message if body is not valid JSON.
  }

  return `${fallbackMessage} (HTTP ${response.status})`;
}

/**
 * CREATE: Sends POST /api/jobs to publish a new job opening as an authenticated recruiter.
 */
export async function createJobOpening(
  apiBaseUrl: string,
  authToken: string,
  payload: CreateJobPayload
): Promise<SingleJobResponse> {
  const endpointUrl = buildApiEndpointUrl(apiBaseUrl, '/jobs');

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await extractJobApiError(response, 'Failed to create job');
    throw new Error(message);
  }

  return (await response.json()) as SingleJobResponse;
}

/**
 * READ (List): Sends GET /api/jobs with optional search and filter query parameters.
 */
export async function fetchJobOpenings(
  apiBaseUrl: string,
  authToken: string,
  filters: JobFilterParams = {}
): Promise<JobListResponse> {
  const queryParams = new URLSearchParams();

  if (filters.search && filters.search.trim().length > 0) {
    queryParams.set('search', filters.search.trim());
  }
  if (filters.department && filters.department.trim().length > 0) {
    queryParams.set('department', filters.department.trim());
  }
  if (filters.jobLocation && filters.jobLocation.trim().length > 0) {
    queryParams.set('jobLocation', filters.jobLocation.trim());
  }
  if (filters.employmentType) {
    queryParams.set('employmentType', filters.employmentType);
  }
  if (filters.jobStatus) {
    queryParams.set('jobStatus', filters.jobStatus);
  }
  if (filters.mine) {
    queryParams.set('mine', 'true');
  }

  const queryString = queryParams.toString();
  const baseEndpoint = buildApiEndpointUrl(apiBaseUrl, '/jobs');
  const fullUrl = queryString ? `${baseEndpoint}?${queryString}` : baseEndpoint;

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const message = await extractJobApiError(response, 'Failed to load jobs');
    throw new Error(message);
  }

  return (await response.json()) as JobListResponse;
}

/**
 * READ (Single): Sends GET /api/jobs/:id to load full details for a specific opening.
 */
export async function fetchJobDetails(
  apiBaseUrl: string,
  authToken: string,
  jobId: number
): Promise<SingleJobResponse> {
  const endpointUrl = buildApiEndpointUrl(apiBaseUrl, `/jobs/${jobId}`);

  const response = await fetch(endpointUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const message = await extractJobApiError(
      response,
      'Failed to load job details'
    );
    throw new Error(message);
  }

  return (await response.json()) as SingleJobResponse;
}

/**
 * UPDATE: Sends PUT /api/jobs/:id to save edits to an existing job opening.
 */
export async function updateJobOpening(
  apiBaseUrl: string,
  authToken: string,
  jobId: number,
  payload: UpdateJobPayload
): Promise<SingleJobResponse> {
  const endpointUrl = buildApiEndpointUrl(apiBaseUrl, `/jobs/${jobId}`);

  const response = await fetch(endpointUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await extractJobApiError(response, 'Failed to update job');
    throw new Error(message);
  }

  return (await response.json()) as SingleJobResponse;
}

/**
 * UPDATE (Close): Sends PATCH /api/jobs/:id/close to mark a job opening as closed.
 */
export async function closeJobOpening(
  apiBaseUrl: string,
  authToken: string,
  jobId: number
): Promise<SingleJobResponse> {
  const endpointUrl = buildApiEndpointUrl(apiBaseUrl, `/jobs/${jobId}/close`);

  const response = await fetch(endpointUrl, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const message = await extractJobApiError(response, 'Failed to close job');
    throw new Error(message);
  }

  return (await response.json()) as SingleJobResponse;
}

/**
 * DELETE: Sends DELETE /api/jobs/:id to permanently delete a job opening.
 */
export async function deleteJobOpening(
  apiBaseUrl: string,
  authToken: string,
  jobId: number
): Promise<void> {
  const endpointUrl = buildApiEndpointUrl(apiBaseUrl, `/jobs/${jobId}`);

  const response = await fetch(endpointUrl, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const message = await extractJobApiError(response, 'Failed to delete job');
    throw new Error(message);
  }
}
