import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingState } from './LoadingState';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types/auth';

export interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

/**
 * Guards routes so only authenticated users with an allowed role can view them.
 */
export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, isAuthLoading, currentUser } = useAuth();
  const location = useLocation();

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          <LoadingState message="Verifying your session..." />
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users to /login while preserving where they wanted to go.
  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Enforce role-based route access when allowedRoles is specified.
  if (allowedRoles && !allowedRoles.includes(currentUser.userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
