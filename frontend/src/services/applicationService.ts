import type {
  ApplicationDetailResponse,
  ApplicationListFilters,
  ApplicationListResponse,
  SubmitApplicationPayload,
  UpdateApplicationStatusPayload,
} from '../types/application';
import { buildApiEndpointUrl } from '../utils/formatters';

interface ApplicationApiErrorBody {
  error?: string;
  message?: string;
}

async function extractApplicationApiError(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  try {
    const errorBody = (await response.json()) as ApplicationApiErrorBody;
    if (errorBody.error) {
      return errorBody.error;
    }
    if (errorBody.message) {
      return errorBody.message;
    }
  } catch {
    // Ignore non-JSON error responses.
  }

  return `${fallbackMessage} (HTTP ${response.status})`;
}

/**
 * Submits a new job application (POST /api/applications) for the authenticated candidate.
 */
export async function submitJobApplication(
  apiBaseUrl: string,
  authToken: string,
  payload: SubmitApplicationPayload
): Promise<ApplicationDetailResponse> {
  const endpointUrl = buildApiEndpointUrl(apiBaseUrl, '/applications');

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
    const message = await extractApplicationApiError(
      response,
      'Failed to submit application'
    );
    throw new Error(message);
  }

  return (await response.json()) as ApplicationDetailResponse;
}

/**
 * Lists all applications submitted by the logged-in candidate (GET /api/applications/me).
 */
export async function fetchMyApplications(
  apiBaseUrl: string,
  authToken: string,
  filters: ApplicationListFilters = {}
): Promise<ApplicationListResponse> {
  const params = new URLSearchParams();
  if (filters.applicationStatus) {
    params.set('applicationStatus', filters.applicationStatus);
  }
  if (filters.jobId) {
    params.set('jobId', String(filters.jobId));
  }

  const baseEndpoint = buildApiEndpointUrl(apiBaseUrl, '/applications/me');
  const queryString = params.toString();
  const fullUrl = queryString ? `${baseEndpoint}?${queryString}` : baseEndpoint;

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const message = await extractApplicationApiError(
      response,
      'Failed to load your applications'
    );
    throw new Error(message);
  }

  return (await response.json()) as ApplicationListResponse;
}

/**
 * Lists applications submitted to the logged-in recruiter's jobs (GET /api/applications/recruiter).
 */
export async function fetchRecruiterApplications(
  apiBaseUrl: string,
  authToken: string,
  filters: ApplicationListFilters = {}
): Promise<ApplicationListResponse> {
  const params = new URLSearchParams();
  if (filters.applicationStatus) {
    params.set('applicationStatus', filters.applicationStatus);
  }
  if (filters.jobId) {
    params.set('jobId', String(filters.jobId));
  }

  const baseEndpoint = buildApiEndpointUrl(
    apiBaseUrl,
    '/applications/recruiter'
  );
  const queryString = params.toString();
  const fullUrl = queryString ? `${baseEndpoint}?${queryString}` : baseEndpoint;

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const message = await extractApplicationApiError(
      response,
      'Failed to load job applications'
    );
    throw new Error(message);
  }

  return (await response.json()) as ApplicationListResponse;
}

/**
 * Fetches complete details and status history for one application (GET /api/applications/:id).
 */
export async function fetchApplicationDetails(
  apiBaseUrl: string,
  authToken: string,
  applicationId: number
): Promise<ApplicationDetailResponse> {
  const endpointUrl = buildApiEndpointUrl(
    apiBaseUrl,
    `/applications/${applicationId}`
  );

  const response = await fetch(endpointUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const message = await extractApplicationApiError(
      response,
      'Failed to load application details'
    );
    throw new Error(message);
  }

  return (await response.json()) as ApplicationDetailResponse;
}

/**
 * Allows the owning recruiter to update an application's status (PATCH /api/applications/:id/status).
 */
export async function updateApplicationStatus(
  apiBaseUrl: string,
  authToken: string,
  applicationId: number,
  payload: UpdateApplicationStatusPayload
): Promise<ApplicationDetailResponse> {
  const endpointUrl = buildApiEndpointUrl(
    apiBaseUrl,
    `/applications/${applicationId}/status`
  );

  const response = await fetch(endpointUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await extractApplicationApiError(
      response,
      'Failed to update application status'
    );
    throw new Error(message);
  }

  return (await response.json()) as ApplicationDetailResponse;
}
