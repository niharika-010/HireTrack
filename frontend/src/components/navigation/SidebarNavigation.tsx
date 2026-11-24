import { NavLink } from 'react-router-dom';
import type { UserRole } from '../../types/auth';
import {
  formatUserRoleLabel,
  getDashboardPathForRole,
} from '../../utils/authHelpers';

export interface SidebarNavigationProps {
  applicationName: string;
  userRole: UserRole;
  isMobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
}

interface SidebarNavItem {
  label: string;
  path?: string;
  endMatch?: boolean;
  isUpcoming?: boolean;
}

/**
 * Builds the sidebar menu items appropriate for the currently logged-in user's role.
 */
function buildNavigationItemsForRole(userRole: UserRole): SidebarNavItem[] {
  const dashboardPath = getDashboardPathForRole(userRole);

  if (userRole === 'admin') {
    return [
      { label: 'Admin Overview', path: dashboardPath, endMatch: true },
      { label: 'Job Listings', path: '/admin/jobs', endMatch: true },
      {
        label: 'Upcoming Interviews',
        path: '/interviews/upcoming',
        endMatch: true,
      },
      {
        label: 'Interview Results',
        path: '/interviews/results',
        endMatch: true,
      },
      { label: 'My Profile', path: '/profile', endMatch: true },
      { label: 'User Directory', isUpcoming: true },
    ];
  }

  if (userRole === 'recruiter') {
    return [
      { label: 'Recruiter Overview', path: dashboardPath, endMatch: true },
      { label: 'Manage Jobs', path: '/recruiter/jobs', endMatch: true },
      { label: 'Create Job', path: '/recruiter/jobs/new', endMatch: true },
      { label: 'Applications', path: '/recruiter/applications', endMatch: true },
      {
        label: 'Upcoming Interviews',
        path: '/interviews/upcoming',
        endMatch: true,
      },
      {
        label: 'Schedule Interview',
        path: '/recruiter/interviews/new',
        endMatch: true,
      },
      {
        label: 'Interview Results',
        path: '/interviews/results',
        endMatch: true,
      },
      { label: 'Browse Open Jobs', path: '/jobs', endMatch: true },
      { label: 'My Profile', path: '/profile', endMatch: true },
    ];
  }

  return [
    { label: 'Candidate Overview', path: dashboardPath, endMatch: true },
    { label: 'Browse Jobs', path: '/jobs', endMatch: true },
    { label: 'My Applications', path: '/candidate/applications', endMatch: true },
    {
      label: 'Upcoming Interviews',
      path: '/interviews/upcoming',
      endMatch: true,
    },
    {
      label: 'Interview Results',
      path: '/interviews/results',
      endMatch: true,
    },
    {
      label: 'Candidate Profile & Resume',
      path: '/candidate/profile',
      endMatch: true,
    },
    { label: 'Account Details', path: '/profile', endMatch: true },
  ];
}

/**
 * Responsive SaaS sidebar navigation: fixed on desktop and slide-over drawer on mobile/tablet.
 */
export function SidebarNavigation({
  applicationName,
  userRole,
  isMobileMenuOpen,
  onCloseMobileMenu,
}: SidebarNavigationProps) {
  const navigationItems = buildNavigationItemsForRole(userRole);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white shadow-xs">
            HT
          </span>
          <div>
            <p className="text-base font-semibold leading-tight text-white">
              {applicationName}
            </p>
            <p className="text-xs text-slate-400">
              {formatUserRoleLabel(userRole)} Portal
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCloseMobileMenu}
          aria-label="Close navigation menu"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <nav aria-label="Sidebar navigation" className="flex-1 space-y-1 px-3 py-5">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Workspace
        </p>

        {navigationItems.map((navItem) => {
          if (navItem.isUpcoming || !navItem.path) {
            return (
              <div
                key={navItem.label}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500"
              >
                <span>{navItem.label}</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <NavLink
              key={navItem.path}
              to={navItem.path}
              end={navItem.endMatch}
              onClick={onCloseMobileMenu}
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {navItem.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4 text-xs text-slate-400">
        <p className="font-medium text-slate-300">HireTrack SaaS</p>
        <p className="mt-0.5">Applications Active</p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block">{sidebarContent}</aside>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={onCloseMobileMenu}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-64 max-w-[80vw] shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
