import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApplicationStatusSummary } from '../components/dashboard/ApplicationStatusSummary';
import { RecruitmentBarChart } from '../components/dashboard/RecruitmentBarChart';
import { UpcomingInterviewsCard } from '../components/dashboard/UpcomingInterviewsCard';
import { FormAlert } from '../components/forms/FormAlert';
import { LoadingState } from '../components/LoadingState';
import { StatCard } from '../components/StatCard';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { fetchCandidateDashboardStats } from '../services/dashboardService';
import type { CandidateDashboardStats } from '../types/dashboard';

/**
 * Candidate dashboard powered by real PostgreSQL analytics from GET /api/dashboard/candidate.
 */
export function CandidateDashboardPage() {
  const { apiBaseUrl } = useAppConfig();
  const { authToken, currentUser } = useAuth();

  const [dashboardStats, setDashboardStats] =
    useState<CandidateDashboardStats | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState<boolean>(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    let isCancelled = false;

    fetchCandidateDashboardStats(apiBaseUrl, authToken)
      .then((statsResponse) => {
        if (!isCancelled) {
          setDashboardStats(statsResponse);
          setWorkspaceError(null);
          setIsLoadingWorkspace(false);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load candidate analytics.';
          setWorkspaceError(message);
          setIsLoadingWorkspace(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken]);

  return (
    <DashboardLayout pageTitle="Candidate Dashboard">
      <div className="space-y-6">
        {workspaceError && (
          <FormAlert variant="error" message={workspaceError} />
        )}

        {isLoadingWorkspace ? (
          <LoadingState message="Loading your candidate dashboard..." />
        ) : dashboardStats ? (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    Candidate Progress Portal
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    Welcome, {currentUser?.fullName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Track your application progress, upcoming interviews, and
                    recruiter alerts in real time.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <Link
                    to="/jobs"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Browse Open Jobs
                  </Link>
                  <Link
                    to="/candidate/profile"
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Profile &amp; Resume
                  </Link>
                </div>
              </div>
            </section>

            {/* Live KPI Statistic Cards */}
            <section
              aria-label="Candidate metrics"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <StatCard
                title="Active Open Jobs"
                value={dashboardStats.activeJobsCount}
                subtitle="Available to apply right now"
                badgeText="Live"
                accent="indigo"
              />
              <StatCard
                title="My Applications"
                value={dashboardStats.totalApplicationsCount}
                subtitle="Total submitted applications"
                badgeText="Live"
                accent="amber"
              />
              <StatCard
                title="Shortlisted / Advanced"
                value={dashboardStats.shortlistedOrAdvancedCount}
                subtitle="Shortlisted, interview or selected"
                badgeText="Live"
                accent="emerald"
              />
              <StatCard
                title="Upcoming Interviews"
                value={dashboardStats.upcomingInterviewsCount}
                subtitle={`${dashboardStats.unreadNotificationsCount} unread alerts`}
                badgeText="Live"
                accent="slate"
              />
            </section>

            {/* Candidate Application Chart & Status Summary */}
            <div className="grid gap-6 lg:grid-cols-2">
              <RecruitmentBarChart
                title="My Application Funnel"
                subtitle="Breakdown of your applications across hiring stages"
                items={dashboardStats.applicationCountsByStatus.map((item) => ({
                  label: item.label,
                  count: item.count,
                  barColorClass:
                    item.status === 'selected'
                      ? 'bg-emerald-600'
                      : item.status === 'rejected'
                        ? 'bg-rose-500'
                        : 'bg-indigo-600',
                }))}
                emptyMessage="Apply to an open job to start tracking your application funnel."
              />

              <UpcomingInterviewsCard
                interviews={dashboardStats.upcomingInterviews}
                emptyDescription="No interviews scheduled yet. Once a recruiter schedules a Technical or HR round, it will appear here."
              />
            </div>

            <ApplicationStatusSummary
              title="My Application Status Summary"
              items={dashboardStats.applicationCountsByStatus}
            />
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
