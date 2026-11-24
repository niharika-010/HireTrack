import type {
  InterviewListFilters,
  InterviewListResponse,
  RecordInterviewFeedbackPayload,
  ScheduleInterviewPayload,
  SingleInterviewResponse,
  UpdateInterviewPayload,
} from '../types/interview';
import { buildApiEndpointUrl } from '../utils/formatters';

interface InterviewApiErrorBody {
  error?: string;
  message?: string;
}

async function extractInterviewApiError(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  try {
    const errorBody = (await response.json()) as InterviewApiErrorBody;
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
 * SCHEDULE: Sends POST /api/interviews to schedule a Technical or HR interview for an application.
 */
export async function scheduleInterview(
  apiBaseUrl: string,
  authToken: string,
  payload: ScheduleInterviewPayload
): Promise<SingleInterviewResponse> {
  const endpointUrl = buildApiEndpointUrl(apiBaseUrl, '/interviews');

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
    const message = await extractInterviewApiError(
      response,
      'Failed to schedule interview'
    );
    throw new Error(message);
  }

  return (await response.json()) as SingleInterviewResponse;
}

/**
 * LIST: Sends GET /api/interviews with optional scope (`upcoming` or `results`) and filters.
 */
export async function fetchInterviews(
  apiBaseUrl: string,
  authToken: string,
  filters: InterviewListFilters = {}
): Promise<InterviewListResponse> {
  const params = new URLSearchParams();

  if (filters.scope && filters.scope !== 'all') {
    params.set('scope', filters.scope);
  }
  if (filters.interviewRound) {
    params.set('interviewRound', filters.interviewRound);
  }
  if (filters.interviewStatus) {
    params.set('interviewStatus', filters.interviewStatus);
  }
  if (filters.interviewResult) {
    params.set('interviewResult', filters.interviewResult);
  }
  if (filters.applicationId) {
    params.set('applicationId', String(filters.applicationId));
  }

  const baseEndpoint = buildApiEndpointUrl(apiBaseUrl, '/interviews');
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
    const message = await extractInterviewApiError(
      response,
      'Failed to load interviews'
    );
    throw new Error(message);
  }

  return (await response.json()) as InterviewListResponse;
}

/**
 * READ (Single): Sends GET /api/interviews/:id to load full interview details and feedback.
 */
export async function fetchInterviewDetails(
  apiBaseUrl: string,
  authToken: string,
  interviewId: number
): Promise<SingleInterviewResponse> {
  const endpointUrl = buildApiEndpointUrl(
    apiBaseUrl,
    `/interviews/${interviewId}`
  );

  const response = await fetch(endpointUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const message = await extractInterviewApiError(
      response,
      'Failed to load interview details'
    );
    throw new Error(message);
  }

  return (await response.json()) as SingleInterviewResponse;
}

/**
 * UPDATE: Sends PUT /api/interviews/:id to edit or reschedule an existing interview.
 */
export async function updateInterviewDetails(
  apiBaseUrl: string,
  authToken: string,
  interviewId: number,
  payload: UpdateInterviewPayload
): Promise<SingleInterviewResponse> {
  const endpointUrl = buildApiEndpointUrl(
    apiBaseUrl,
    `/interviews/${interviewId}`
  );

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
    const message = await extractInterviewApiError(
      response,
      'Failed to update interview'
    );
    throw new Error(message);
  }

  return (await response.json()) as SingleInterviewResponse;
}

/**
 * FEEDBACK: Sends PATCH /api/interviews/:id/feedback to save interviewer feedback, rating, and result.
 */
export async function recordInterviewFeedback(
  apiBaseUrl: string,
  authToken: string,
  interviewId: number,
  payload: RecordInterviewFeedbackPayload
): Promise<SingleInterviewResponse> {
  const endpointUrl = buildApiEndpointUrl(
    apiBaseUrl,
    `/interviews/${interviewId}/feedback`
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
    const message = await extractInterviewApiError(
      response,
      'Failed to record interview feedback'
    );
    throw new Error(message);
  }

  return (await response.json()) as SingleInterviewResponse;
}
