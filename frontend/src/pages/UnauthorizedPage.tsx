import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MainLayout } from '../layouts/MainLayout';
import { getDashboardPathForRole } from '../utils/authHelpers';

/**
 * Shown when an authenticated user attempts to visit a route reserved for another role.
 */
export function UnauthorizedPage() {
  const { currentUser } = useAuth();
  const returnPath = currentUser
    ? getDashboardPathForRole(currentUser.userRole)
    : '/login';

  return (
    <MainLayout>
      <div className="mx-auto max-w-lg rounded-xl border border-rose-200 bg-white p-8 text-center shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
          403 &middot; Access Denied
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          You do not have permission to view this page
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Your current role ({currentUser?.userRole ?? 'guest'}) is restricted
          from accessing this workspace.
        </p>
        <Link
          to={returnPath}
          className="mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Go to your workspace
        </Link>
      </div>
    </MainLayout>
  );
}
