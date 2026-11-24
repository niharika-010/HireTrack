import type {
  AdminDashboardStats,
  CandidateDashboardStats,
  RecruiterDashboardStats,
} from '../types/dashboard';
import { buildApiEndpointUrl } from '../utils/formatters';

interface DashboardErrorPayload {
  error?: string;
  message?: string;
}

async function fetchTypedDashboardStats<T>(
  apiBaseUrl: string,
  authToken: string,
  endpointPath: string,
  fallbackMessage: string
): Promise<T> {
  const fullUrl = buildApiEndpointUrl(apiBaseUrl, endpointPath);

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    try {
      const errorBody = (await response.json()) as DashboardErrorPayload;
      if (errorBody.error) {
        throw new Error(errorBody.error);
      }
      if (errorBody.message) {
        throw new Error(errorBody.message);
      }
    } catch (error) {
      if (error instanceof Error && error.message) {
        throw error;
      }
    }
    throw new Error(`${fallbackMessage} (HTTP ${response.status})`);
  }

  return (await response.json()) as T;
}

/**
 * Fetches live platform-wide analytics from GET /api/dashboard/admin (Admin only).
 */
export function fetchAdminDashboardStats(
  apiBaseUrl: string,
  authToken: string
): Promise<AdminDashboardStats> {
  return fetchTypedDashboardStats<AdminDashboardStats>(
    apiBaseUrl,
    authToken,
    '/dashboard/admin',
    'Failed to load admin analytics'
  );
}

/**
 * Fetches recruiter-scoped hiring analytics from GET /api/dashboard/recruiter (Recruiter only).
 */
export function fetchRecruiterDashboardStats(
  apiBaseUrl: string,
  authToken: string
): Promise<RecruiterDashboardStats> {
  return fetchTypedDashboardStats<RecruiterDashboardStats>(
    apiBaseUrl,
    authToken,
    '/dashboard/recruiter',
    'Failed to load recruiter analytics'
  );
}

/**
 * Fetches candidate-scoped application analytics from GET /api/dashboard/candidate (Candidate only).
 */
export function fetchCandidateDashboardStats(
  apiBaseUrl: string,
  authToken: string
): Promise<CandidateDashboardStats> {
  return fetchTypedDashboardStats<CandidateDashboardStats>(
    apiBaseUrl,
    authToken,
    '/dashboard/candidate',
    'Failed to load candidate analytics'
  );
}
