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
import { fetchRoleProtectedArea } from '../services/authService';
import { fetchAdminDashboardStats } from '../services/dashboardService';
import type { UserRole } from '../types/auth';
import type { AdminDashboardStats } from '../types/dashboard';

/**
 * Admin dashboard powered by real PostgreSQL analytics from GET /api/dashboard/admin.
 */
export function AdminDashboardPage() {
  const { apiBaseUrl } = useAppConfig();
  const { authToken, currentUser } = useAuth();

  const [dashboardStats, setDashboardStats] =
    useState<AdminDashboardStats | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState<boolean>(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [rbacCheckMessage, setRbacCheckMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    let isCancelled = false;

    fetchAdminDashboardStats(apiBaseUrl, authToken)
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
              : 'Unable to load platform analytics.';
          setWorkspaceError(message);
          setIsLoadingWorkspace(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken]);

  async function handleCheckRoleEndpoint(targetRole: UserRole) {
    if (!authToken) {
      return;
    }

    setRbacCheckMessage(`Checking GET /api/protected/${targetRole}...`);

    try {
      const response = await fetchRoleProtectedArea(
        apiBaseUrl,
        authToken,
        targetRole
      );
      setRbacCheckMessage(`Allowed (200 OK): ${response.message}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Access denied.';
      setRbacCheckMessage(`Blocked (403 Forbidden): ${message}`);
    }
  }

  return (
    <DashboardLayout pageTitle="Admin Dashboard">
      <div className="space-y-6">
        {workspaceError && (
          <FormAlert variant="error" message={workspaceError} />
        )}

        {isLoadingWorkspace ? (
          <LoadingState message="Loading live platform analytics..." />
        ) : dashboardStats ? (
          <>
            {/* Welcome Banner */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    Admin Analytics Portal
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    Welcome, {currentUser?.fullName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Live recruitment metrics calculated directly from PostgreSQL
                    across {dashboardStats.totalRecruitersCount} recruiter
                    {dashboardStats.totalRecruitersCount === 1 ? '' : 's'} and{' '}
                    {dashboardStats.totalCandidatesCount} candidate
                    {dashboardStats.totalCandidatesCount === 1 ? '' : 's'}.
                  </p>
                </div>
                <Link
                  to="/admin/jobs"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Review All Jobs
                </Link>
              </div>
            </section>

            {/* Live KPI Statistic Cards */}
            <section
              aria-label="Admin platform metrics"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <StatCard
                title="Active Jobs"
                value={dashboardStats.activeJobsCount}
                subtitle={`${dashboardStats.totalJobsCount} total openings`}
                badgeText="Live"
                accent="emerald"
              />
              <StatCard
                title="Total Candidates"
                value={dashboardStats.totalCandidatesCount}
                subtitle={`${dashboardStats.totalRecruitersCount} active recruiters`}
                badgeText="Live"
                accent="indigo"
              />
              <StatCard
                title="Total Applications"
                value={dashboardStats.totalApplicationsCount}
                subtitle="Across all job openings"
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
                title="Applications by Status"
                subtitle="Platform-wide recruitment funnel breakdown"
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
                emptyMessage="No applications submitted across the platform yet."
              />

              <RecruitmentBarChart
                title="Jobs by Department"
                subtitle="Distribution of job openings across teams"
                items={dashboardStats.jobsByDepartment.map((item) => ({
                  label: item.label,
                  count: item.count,
                  barColorClass: 'bg-teal-600',
                }))}
                emptyMessage="No job openings published yet."
              />
            </div>

            {/* Application Status Summary */}
            <ApplicationStatusSummary
              title="Platform Application Status Summary"
              items={dashboardStats.applicationCountsByStatus}
            />

            {/* Upcoming Interviews */}
            <UpcomingInterviewsCard
              interviews={dashboardStats.upcomingInterviews}
              emptyDescription="No upcoming interviews are scheduled across HireTrack right now."
            />

            {/* Interactive RBAC verification bar */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <h3 className="text-base font-semibold text-slate-900">
                Role Access Verification
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Verify that your Admin JWT grants access to Admin APIs while
                restricting Recruiter and Candidate routes.
              </p>

              <div className="mt-4 flex flex-wrap gap-2.5">
                {(['admin', 'recruiter', 'candidate'] as UserRole[]).map(
                  (roleOption) => (
                    <button
                      key={roleOption}
                      type="button"
                      onClick={() => void handleCheckRoleEndpoint(roleOption)}
                      className="rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 sm:text-sm"
                    >
                      Test /api/protected/{roleOption}
                    </button>
                  )
                )}
              </div>

              {rbacCheckMessage && (
                <div className="mt-4">
                  <FormAlert variant="info" message={rbacCheckMessage} />
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
