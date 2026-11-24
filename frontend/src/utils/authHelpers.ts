import type { UserRole } from '../types/auth';

/**
 * Maps each HireTrack role to its dedicated protected dashboard route.
 */
export function getDashboardPathForRole(userRole: UserRole): string {
  if (userRole === 'admin') {
    return '/admin/dashboard';
  }

  if (userRole === 'recruiter') {
    return '/recruiter/dashboard';
  }

  return '/candidate/dashboard';
}

/**
 * Returns a human-readable display label for a user's role.
 */
export function formatUserRoleLabel(userRole: UserRole): string {
  if (userRole === 'admin') {
    return 'Admin';
  }

  if (userRole === 'recruiter') {
    return 'Recruiter';
  }

  return 'Candidate';
}

/**
 * Validates an email input string and returns an error message if invalid.
 */
export function validateEmailInput(userEmail: string): string | null {
  const trimmedEmail = userEmail.trim();

  if (trimmedEmail.length === 0) {
    return 'Email address is required.';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmedEmail)) {
    return 'Please enter a valid email address.';
  }

  return null;
}

/**
 * Validates a password input string and returns an error message if it does not meet length rules.
 */
export function validatePasswordInput(userPassword: string): string | null {
  if (userPassword.length === 0) {
    return 'Password is required.';
  }

  if (userPassword.length < 8) {
    return 'Password must be at least 8 characters long.';
  }

  return null;
}
