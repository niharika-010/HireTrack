import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../hooks/useAuth';
import {
  formatUserRoleLabel,
  getDashboardPathForRole,
} from '../utils/authHelpers';

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * Shared page shell containing the top header bar, role-aware navigation, and main content area.
 */
export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const { applicationName } = useAppConfig();
  const { isAuthenticated, currentUser, logoutUser } = useAuth();

  async function handleLogoutClick() {
    await logoutUser();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              HT
            </span>
            <div>
              <p className="text-lg font-semibold leading-tight text-slate-900">
                {applicationName}
              </p>
              <p className="text-xs text-slate-500">
                Recruitment Management System
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-3 text-sm">
            {isAuthenticated && currentUser ? (
              <>
                <Link
                  to={getDashboardPathForRole(currentUser.userRole)}
                  className="font-medium text-slate-700 hover:text-indigo-600"
                >
                  Dashboard
                </Link>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  {formatUserRoleLabel(currentUser.userRole)}
                </span>
                <button
                  type="button"
                  onClick={() => void handleLogoutClick()}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-indigo-600 px-3.5 py-1.5 font-medium text-white hover:bg-indigo-700"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
