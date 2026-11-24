// Shared TypeScript types for the HireTrack Recruitment Management System.
// Only foundational types are included in Phase 1; feature-specific models will be added in later phases.

/**
 * Represents the lifecycle stages of a candidate's job application.
 */
export type ApplicationStatus =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected';

/**
 * Core recruitment summary shape used as a shared reference across modules.
 */
export interface CandidateApplicationSummary {
  candidateName: string;
  jobTitle: string;
  applicationStatus: ApplicationStatus;
}

/**
 * Connection state reported when checking the Loco.rs backend health endpoint.
 */
export type BackendConnectionState = 'checking' | 'connected' | 'unreachable';

/**
 * Expected JSON response returned by the backend /api/health endpoint.
 */
export interface BackendHealthResponse {
  status: string;
  serviceName: string;
  databaseStatus?: string;
}

/**
 * Runtime configuration values loaded from Vite environment variables.
 */
export interface ApplicationConfiguration {
  applicationName: string;
  apiBaseUrl: string;
  environmentName: string;
}
