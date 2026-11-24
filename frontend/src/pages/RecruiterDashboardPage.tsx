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
import { fetchRecruiterDashboardStats } from '../services/dashboardService';
import type { RecruiterDashboardStats } from '../types/dashboard';

/**
 * Recruiter dashboard displaying recruiter-scoped PostgreSQL analytics, charts, and upcoming interviews.
 */
export function RecruiterDashboardPage() {
  const { apiBaseUrl } = useAppConfig();
  const { authToken, currentUser } = useAuth();

  const [dashboardStats, setDashboardStats] =
    useState<RecruiterDashboardStats | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState<boolean>(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    let isCancelled = false;

    fetchRecruiterDashboardStats(apiBaseUrl, authToken)
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
              : 'Unable to load recruiter analytics.';
          setWorkspaceError(message);
          setIsLoadingWorkspace(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken]);

  return (
    <DashboardLayout pageTitle="Recruiter Dashboard">
      <div className="space-y-6">
        {workspaceError && (
          <FormAlert variant="error" message={workspaceError} />
        )}

        {isLoadingWorkspace ? (
          <LoadingState message="Loading live recruiter analytics..." />
        ) : dashboardStats ? (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    Recruiter Analytics Workspace
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    Hello, {currentUser?.fullName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Live hiring metrics across your job openings, applicants,
                    and scheduled Technical &amp; HR rounds.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <Link
                    to="/recruiter/applications"
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Review Applications
                  </Link>
                  <Link
                    to="/recruiter/jobs/new"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    + Create Job
                  </Link>
                </div>
              </div>
            </section>

            {/* Live KPI Statistic Cards */}
            <section
              aria-label="Recruiter metrics"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <StatCard
                title="Active Jobs"
                value={dashboardStats.activeJobsCount}
                subtitle={`${dashboardStats.totalJobsCount} total managed jobs`}
                badgeText="Live"
                accent="emerald"
              />
              <StatCard
                title="Unique Candidates"
                value={dashboardStats.totalCandidatesCount}
                subtitle="Candidates who applied to you"
                badgeText="Live"
                accent="indigo"
              />
              <StatCard
                title="Applications Received"
                value={dashboardStats.totalApplicationsCount}
                subtitle="Across your job openings"
                badgeText="Live"
                accent="amber"
              />
              <StatCard
                title="Upcoming Interviews"
                value={dashboardStats.upcomingInterviewsCount}
                subtitle={`${dashboardStats.unreadNotificationsCount} unread alerts`}
                badgeText="Live"
                accent="slate"
              />
            </section>

            {/* Recruitment Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <RecruitmentBarChart
                title="Hiring Pipeline by Status"
                subtitle="Your applicants broken down by recruitment stage"
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
                emptyMessage="No applications received for your jobs yet."
              />

              <RecruitmentBarChart
                title="Applications by Job Opening"
                subtitle="Candidate demand across each of your posted roles"
                items={dashboardStats.applicationsByJob.map((item) => ({
                  label: item.label,
                  count: item.count,
                  barColorClass: 'bg-amber-500',
                }))}
                emptyMessage="Publish a job opening and receive applications to view per-role demand."
              />
            </div>

            {/* Application Status Summary */}
            <ApplicationStatusSummary
              title="Applicant Status Summary"
              items={dashboardStats.applicationCountsByStatus}
            />

            {/* Upcoming Interviews */}
            <UpcomingInterviewsCard
              interviews={dashboardStats.upcomingInterviews}
              emptyDescription="No upcoming interviews scheduled yet. Open any candidate application to schedule a Technical or HR interview."
            />
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
