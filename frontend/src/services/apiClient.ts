import type { BackendHealthResponse } from '../types/recruitment';
import { buildApiEndpointUrl } from '../utils/formatters';

/**
 * Reads the backend API base URL from Vite environment variables,
 * falling back to the local Loco.rs development server.
 */
export function getApiBaseUrl(): string {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL;

  if (typeof configuredApiUrl === 'string' && configuredApiUrl.trim().length > 0) {
    return configuredApiUrl.trim();
  }

  return 'http://localhost:5150/api';
}

/**
 * Requests the backend health endpoint to confirm that the Loco.rs API is reachable.
 */
export async function checkBackendHealth(
  apiBaseUrl: string
): Promise<BackendHealthResponse> {
  const healthEndpointUrl = buildApiEndpointUrl(apiBaseUrl, '/health');

  const response = await fetch(healthEndpointUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Backend responded with HTTP status ${response.status}`);
  }

  const responseData = (await response.json()) as BackendHealthResponse;
  return responseData;
}
