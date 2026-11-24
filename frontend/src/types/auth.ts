// Authentication and authorization TypeScript types for HireTrack.

export type UserRole = 'admin' | 'recruiter' | 'candidate';

/**
 * Safe public user profile returned by the Loco.rs backend.
 * Sensitive fields such as password hashes are never returned by the API.
 */
export interface AuthenticatedUserProfile {
  userId: number;
  fullName: string;
  userEmail: string;
  userRole: UserRole;
  isActive: boolean;
}

/**
 * Request body sent to POST /api/auth/register.
 */
export interface RegisterUserPayload {
  fullName: string;
  userEmail: string;
  userPassword: string;
  userRole: UserRole;
  companyName?: string;
}

/**
 * Request body sent to POST /api/auth/login.
 */
export interface LoginUserPayload {
  userEmail: string;
  userPassword: string;
}

/**
 * Response body returned by POST /api/auth/register and POST /api/auth/login.
 */
export interface AuthSuccessResponse {
  message: string;
  token: string;
  user: AuthenticatedUserProfile;
}

/**
 * Response body returned by GET /api/auth/me.
 */
export interface CurrentUserResponse {
  user: AuthenticatedUserProfile;
}

/**
 * Response body returned by role-protected endpoints under /api/protected/*.
 */
export interface RoleProtectedResponse {
  message: string;
  areaName: string;
  userEmail: string;
  userRole: UserRole;
}
