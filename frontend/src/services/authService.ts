import type {
  AuthSuccessResponse,
  CurrentUserResponse,
  LoginUserPayload,
  RegisterUserPayload,
  RoleProtectedResponse,
  UserRole,
} from '../types/auth';
import { buildApiEndpointUrl } from '../utils/formatters';

interface ApiErrorPayload {
  error?: string;
  message?: string;
}

/**
 * Reads a readable error message from a failed backend JSON response.
 */
async function extractApiErrorMessage(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  try {
    const errorPayload = (await response.json()) as ApiErrorPayload;
    if (errorPayload.error) {
      return errorPayload.error;
    }
    if (errorPayload.message) {
      return errorPayload.message;
    }
  } catch {
    // Ignore JSON parsing failure and fall back to the default message.
  }

  return `${fallbackMessage} (HTTP ${response.status})`;
}

/**
 * Sends a registration request to POST /api/auth/register.
 */
export async function registerAccount(
  apiBaseUrl: string,
  payload: RegisterUserPayload
): Promise<AuthSuccessResponse> {
  const endpointUrl = buildApiEndpointUrl(apiBaseUrl, '/auth/register');

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await extractApiErrorMessage(response, 'Registration failed');
    throw new Error(message);
  }

  return (await response.json()) as AuthSuccessResponse;
}

/**
 * Sends user credentials to POST /api/auth/login and receives a signed JWT.
 */
export async function loginAccount(
  apiBaseUrl: string,
  payload: LoginUserPayload
): Promise<AuthSuccessResponse> {
  const endpointUrl = buildApiEndpointUrl(apiBaseUrl, '/auth/login');

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await extractApiErrorMessage(response, 'Login failed');
    throw new Error(message);
  }

  return (await response.json()) as AuthSuccessResponse;
}

/**
 * Calls GET /api/auth/me with the Bearer JWT to retrieve the currently logged-in user.
 */
export async function fetchCurrentUser(
  apiBaseUrl: string,
  authToken: string
): Promise<CurrentUserResponse> {
  const endpointUrl = buildApiEndpointUrl(apiBaseUrl, '/auth/me');

  const response = await fetch(endpointUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const message = await extractApiErrorMessage(
      response,
      'Failed to verify user session'
    );
    throw new Error(message);
  }

  return (await response.json()) as CurrentUserResponse;
}

/**
 * Calls POST /api/auth/logout so the backend revokes the active JWT server-side.
 */
export async function logoutAccount(
  apiBaseUrl: string,
  authToken: string
): Promise<void> {
  const endpointUrl = buildApiEndpointUrl(apiBaseUrl, '/auth/logout');

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok && response.status !== 401) {
    const message = await extractApiErrorMessage(response, 'Logout failed');
    throw new Error(message);
  }
}

/**
 * Calls a role-restricted backend endpoint (/api/protected/{role}) to verify RBAC enforcement.
 */
export async function fetchRoleProtectedArea(
  apiBaseUrl: string,
  authToken: string,
  targetRole: UserRole
): Promise<RoleProtectedResponse> {
  const endpointUrl = buildApiEndpointUrl(apiBaseUrl, `/protected/${targetRole}`);

  const response = await fetch(endpointUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const message = await extractApiErrorMessage(
      response,
      `Access denied for ${targetRole} area`
    );
    throw new Error(message);
  }

  return (await response.json()) as RoleProtectedResponse;
}
