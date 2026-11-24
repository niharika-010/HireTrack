import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApplicationStatusBadge } from '../components/applications/ApplicationStatusBadge';
import { EmptyState } from '../components/EmptyState';
import { FormAlert } from '../components/forms/FormAlert';
import { FormSelect } from '../components/forms/FormSelect';
import type { SelectOptionItem } from '../components/forms/FormSelect';
import { LoadingState } from '../components/LoadingState';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { fetchMyApplications } from '../services/applicationService';
import type {
  ApplicationSummary,
  HireTrackApplicationStatus,
} from '../types/application';
import {
  ALL_APPLICATION_STATUSES,
  formatApplicationStatusName,
} from '../utils/applicationHelpers';
import {
  formatEmploymentTypeLabel,
  formatShortDate,
} from '../utils/jobHelpers';

const STATUS_FILTER_OPTIONS: SelectOptionItem[] = [
  { value: '', label: 'All statuses' },
  ...ALL_APPLICATION_STATUSES.map((status) => ({
    value: status,
    label: formatApplicationStatusName(status),
  })),
];

/**
 * Candidate's "My Applications" page listing every submitted application and its current status.
 */
export function MyApplicationsPage() {
  const { apiBaseUrl } = useAppConfig();
  const { authToken } = useAuth();

  const [statusFilter, setStatusFilter] = useState<
    HireTrackApplicationStatus | ''
  >('');
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    let isCancelled = false;

    fetchMyApplications(apiBaseUrl, authToken, {
      applicationStatus: statusFilter,
    })
      .then((response) => {
        if (!isCancelled) {
          setApplications(response.applications);
          setPageError(null);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load your applications.';
          setPageError(message);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken, statusFilter]);

  const handleStatusFilterChange = useCallback(
    (nextStatus: string) => {
      setIsLoading(true);
      setStatusFilter(nextStatus as HireTrackApplicationStatus | '');
    },
    []
  );

  return (
    <DashboardLayout pageTitle="My Applications">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Track your submitted applications
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Monitor live recruiter updates and open any application to view
              its full status timeline.
            </p>
          </div>

          <div className="w-full sm:w-56">
            <FormSelect
              selectId="my-applications-status-filter"
              label="Filter by status"
              value={statusFilter}
              options={STATUS_FILTER_OPTIONS}
              onValueChange={handleStatusFilterChange}
            />
          </div>
        </div>

        {pageError && <FormAlert variant="error" message={pageError} />}

        {isLoading ? (
          <LoadingState message="Loading your applications..." />
        ) : applications.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description={
              statusFilter
                ? 'None of your applications currently match this status filter.'
                : 'You have not applied to any job openings yet. Explore active jobs to submit your first application.'
            }
            action={
              <Link
                to="/jobs"
                className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Browse Open Jobs
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4">
            {applications.map((item) => (
              <article
                key={item.applicationId}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-300"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <ApplicationStatusBadge
                      applicationStatus={item.applicationStatus}
                    />
                    <span className="text-xs text-slate-500">
                      Applied {formatShortDate(item.appliedAt)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    <Link
                      to={`/applications/${item.applicationId}`}
                      className="hover:text-indigo-600"
                    >
                      {item.jobTitle}
                    </Link>
                  </h3>
                  <p className="text-xs text-slate-600">
                    {item.companyName} &middot; {item.department} &middot;{' '}
                    {item.jobLocation} &middot;{' '}
                    {formatEmploymentTypeLabel(item.employmentType)}
                  </p>
                </div>

                <Link
                  to={`/applications/${item.applicationId}`}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  Track Status &amp; Details
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
