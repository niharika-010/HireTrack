import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../hooks/useAuth';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { MainLayout } from '../layouts/MainLayout';
import { getDashboardPathForRole } from '../utils/authHelpers';

/**
 * Public landing page introducing HireTrack and confirming backend connectivity.
 */
export function HomePage() {
  const { applicationName, apiBaseUrl } = useAppConfig();
  const { isAuthenticated, currentUser } = useAuth();
  const { connectionState, statusMessage, recheckBackendHealth } =
    useBackendHealth(apiBaseUrl);

  return (
    <MainLayout>
      <div className="space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs sm:p-10">
          <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            Recruitment Management SaaS
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Hire smarter with {applicationName}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            A modern full-stack recruitment platform with dedicated workspaces
            for Admins, Recruiters, and Candidates — built with Rust, Loco.rs,
            PostgreSQL, React, TypeScript, and Tailwind CSS.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {isAuthenticated && currentUser ? (
              <Link
                to={getDashboardPathForRole(currentUser.userRole)}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Open Your Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Backend API Connection
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                API Endpoint:{' '}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">
                  {apiBaseUrl}
                </code>
              </p>
            </div>
            <StatusBadge connectionState={connectionState} />
          </div>

          <p className="mt-4 text-sm text-slate-700">{statusMessage}</p>

          <button
            type="button"
            onClick={() => void recheckBackendHealth()}
            className="mt-4 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Recheck Connection
          </button>
        </section>
      </div>
    </MainLayout>
  );
}
