import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAppConfig } from '../hooks/useAppConfig';

export interface AuthLayoutProps {
  heading: string;
  subheading: string;
  children: ReactNode;
}

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Modern split-screen SaaS layout for Login and Registration pages.
 * Shows a branded overview panel on desktop and focuses cleanly on the form on mobile/tablet.
 */
export function AuthLayout({ heading, subheading, children }: AuthLayoutProps) {
  const { applicationName } = useAppConfig();

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-12">
      {/* Left branded panel visible on desktop screens */}
      <aside className="hidden flex-col justify-between bg-slate-900 p-10 text-white lg:col-span-5 lg:flex">
        <Link to="/" className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-sm font-bold text-white">
            HT
          </span>
          <div>
            <p className="text-lg font-semibold leading-tight">
              {applicationName}
            </p>
            <p className="text-xs text-slate-400">
              Recruitment Management System
            </p>
          </div>
        </Link>

        <div className="space-y-6">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Streamlined hiring for every role on your team.
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">
            Dedicated workspaces for Admins, Recruiters, and Candidates backed
            by a Rust + Loco.rs API and PostgreSQL database.
          </p>

          <ul className="space-y-3 text-sm text-slate-300">
            <li className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              Role-based access control for Admin, Recruiter &amp; Candidate
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Argon2id password hashing and server-side token revocation
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Clean, responsive workspace designed for speed and clarity
            </li>
          </ul>
        </div>

        <p className="text-xs text-slate-400">
          &copy; {CURRENT_YEAR} {applicationName}. Built with Rust,
          Loco.rs &amp; React.
        </p>
      </aside>

      {/* Right authentication form area */}
      <main className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:col-span-7">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile brand link */}
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2.5 lg:hidden"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              HT
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {applicationName}
            </span>
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {heading}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">{subheading}</p>

            <div className="mt-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
