import type {
  CandidateProfileResponse,
  UpdateCandidateProfilePayload,
} from '../types/candidate';
import { buildApiEndpointUrl } from '../utils/formatters';

interface CandidateApiErrorBody {
  error?: string;
  message?: string;
}

async function extractCandidateApiError(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  try {
    const errorBody = (await response.json()) as CandidateApiErrorBody;
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
 * Loads the logged-in candidate's profile and resume metadata from GET /api/candidates/me.
 */
export async function fetchCandidateProfile(
  apiBaseUrl: string,
  authToken: string
): Promise<CandidateProfileResponse> {
  const endpointUrl = buildApiEndpointUrl(apiBaseUrl, '/candidates/me');

  const response = await fetch(endpointUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const message = await extractCandidateApiError(
      response,
      'Failed to load candidate profile'
    );
    throw new Error(message);
  }

  return (await response.json()) as CandidateProfileResponse;
}

/**
 * Updates the logged-in candidate's profile via PUT /api/candidates/me.
 */
export async function updateCandidateProfile(
  apiBaseUrl: string,
  authToken: string,
  payload: UpdateCandidateProfilePayload
): Promise<CandidateProfileResponse> {
  const endpointUrl = buildApiEndpointUrl(apiBaseUrl, '/candidates/me');

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
    const message = await extractCandidateApiError(
      response,
      'Failed to update candidate profile'
    );
    throw new Error(message);
  }

  return (await response.json()) as CandidateProfileResponse;
}

/**
 * Uploads a validated PDF or DOCX resume using multipart/form-data to POST /api/candidates/me/resume.
 */
export async function uploadCandidateResume(
  apiBaseUrl: string,
  authToken: string,
  resumeFile: File
): Promise<CandidateProfileResponse> {
  const endpointUrl = buildApiEndpointUrl(apiBaseUrl, '/candidates/me/resume');
  const formData = new FormData();
  formData.append('resume', resumeFile);

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await extractCandidateApiError(
      response,
      'Failed to upload resume'
    );
    throw new Error(message);
  }

  return (await response.json()) as CandidateProfileResponse;
}

/**
 * Opens an authenticated resume URL in a new browser tab by fetching it with the Bearer JWT.
 */
export async function openAuthenticatedResume(
  resumeUrl: string,
  authToken: string
): Promise<void> {
  const response = await fetch(resumeUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to open resume file (HTTP ${response.status}).`);
  }

  const fileBlob = await response.blob();
  const objectUrl = window.URL.createObjectURL(fileBlob);
  window.open(objectUrl, '_blank', 'noopener,noreferrer');
}
