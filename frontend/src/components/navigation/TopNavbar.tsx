import { Link } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import type { AuthenticatedUserProfile } from '../../types/auth';
import { formatUserRoleLabel } from '../../utils/authHelpers';

export interface TopNavbarProps {
  pageTitle: string;
  currentUser: AuthenticatedUserProfile;
  onOpenMobileMenu: () => void;
  onLogout: () => void;
}

/**
 * Extracts up to two uppercase initials from a user's full name for the avatar badge.
 */
function buildUserInitials(fullName: string): string {
  const nameWords = fullName
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (nameWords.length === 0) {
    return 'U';
  }

  if (nameWords.length === 1) {
    return nameWords[0].slice(0, 2).toUpperCase();
  }

  return `${nameWords[0][0]}${nameWords[nameWords.length - 1][0]}`.toUpperCase();
}

/**
 * Sticky top navigation bar displaying the mobile menu trigger, page heading, user profile summary, and logout action.
 */
export function TopNavbar({
  pageTitle,
  currentUser,
  onOpenMobileMenu,
  onLogout,
}: TopNavbarProps) {
  const userInitials = buildUserInitials(currentUser.fullName);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {/* Mobile & tablet drawer trigger */}
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>

          <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <NotificationBell />

          <Link
            to="/profile"
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-slate-100"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              {userInitials}
            </span>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight text-slate-900">
                {currentUser.fullName}
              </p>
              <p className="text-xs text-slate-500">
                {formatUserRoleLabel(currentUser.userRole)}
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
