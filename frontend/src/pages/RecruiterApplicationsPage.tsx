import { useEffect, useState } from 'react';
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
import {
  fetchRecruiterApplications,
  updateApplicationStatus,
} from '../services/applicationService';
import { openAuthenticatedResume } from '../services/candidateService';
import { fetchJobOpenings } from '../services/jobService';
import type {
  ApplicationSummary,
  HireTrackApplicationStatus,
} from '../types/application';
import type { JobOpening } from '../types/job';
import {
  ALL_APPLICATION_STATUSES,
  formatApplicationStatusName,
} from '../utils/applicationHelpers';
import { formatShortDate } from '../utils/jobHelpers';

const STATUS_OPTIONS: SelectOptionItem[] = [
  { value: '', label: 'All statuses' },
  ...ALL_APPLICATION_STATUSES.map((status) => ({
    value: status,
    label: formatApplicationStatusName(status),
  })),
];

/**
 * Recruiter application management workspace showing all applicants across the recruiter's jobs.
 */
export function RecruiterApplicationsPage() {
  const { apiBaseUrl } = useAppConfig();
  const { authToken } = useAuth();

  const [myJobs, setMyJobs] = useState<JobOpening[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<
    HireTrackApplicationStatus | ''
  >('');
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [busyApplicationId, setBusyApplicationId] = useState<number | null>(
    null
  );

  // Load the recruiter's jobs once for the Job filter dropdown.
  useEffect(() => {
    if (!authToken) {
      return;
    }

    let isCancelled = false;

    fetchJobOpenings(apiBaseUrl, authToken, { mine: true })
      .then((response) => {
        if (!isCancelled) {
          setMyJobs(response.jobs);
        }
      })
      .catch(() => {
        // Non-blocking: applications list still loads independently.
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken]);

  // Load applications whenever job or status filters change.
  useEffect(() => {
    if (!authToken) {
      return;
    }

    let isCancelled = false;
    const numericJobId = selectedJobId ? Number(selectedJobId) : undefined;

    fetchRecruiterApplications(apiBaseUrl, authToken, {
      jobId: numericJobId,
      applicationStatus: selectedStatus,
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
              : 'Unable to load candidate applications.';
          setPageError(message);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken, selectedJobId, selectedStatus]);

  const jobFilterOptions: SelectOptionItem[] = [
    { value: '', label: 'All my job openings' },
    ...myJobs.map((job) => ({
      value: String(job.jobId),
      label: job.jobTitle,
    })),
  ];

  async function handleQuickStatusChange(
    applicationId: number,
    nextStatus: HireTrackApplicationStatus
  ) {
    if (!authToken) {
      return;
    }

    setBusyApplicationId(applicationId);
    setPageError(null);
    setActionSuccess(null);

    try {
      const response = await updateApplicationStatus(
        apiBaseUrl,
        authToken,
        applicationId,
        {
          applicationStatus: nextStatus,
          statusNote: null,
        }
      );

      setApplications((prev) =>
        prev.map((item) =>
          item.applicationId === applicationId
            ? {
                ...item,
                applicationStatus: response.application.applicationStatus,
                updatedAt: response.application.updatedAt,
              }
            : item
        )
      );
      setActionSuccess(
        `Updated ${response.application.candidateName}'s application to ${formatApplicationStatusName(nextStatus)}.`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update application status.';
      setPageError(message);
    } finally {
      setBusyApplicationId(null);
    }
  }

  async function handleOpenResume(resumeUrl: string) {
    if (!authToken) {
      return;
    }

    try {
      await openAuthenticatedResume(resumeUrl, authToken);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to open resume.';
      setPageError(message);
    }
  }

  return (
    <DashboardLayout pageTitle="Candidate Applications">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Review Applicants
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            View candidates who applied to your job openings, inspect resumes,
            and update hiring statuses.
          </p>
        </div>

        {/* Filters */}
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:grid-cols-2">
          <FormSelect
            selectId="recruiter-apps-job-filter"
            label="Filter by Job Opening"
            value={selectedJobId}
            options={jobFilterOptions}
            onValueChange={(value) => {
              setIsLoading(true);
              setSelectedJobId(value);
            }}
          />

          <FormSelect
            selectId="recruiter-apps-status-filter"
            label="Filter by Status"
            value={selectedStatus}
            options={STATUS_OPTIONS}
            onValueChange={(value) => {
              setIsLoading(true);
              setSelectedStatus(value as HireTrackApplicationStatus | '');
            }}
          />
        </div>

        {pageError && <FormAlert variant="error" message={pageError} />}
        {actionSuccess && (
          <FormAlert variant="success" message={actionSuccess} />
        )}

        {isLoading ? (
          <LoadingState message="Loading applications for your jobs..." />
        ) : applications.length === 0 ? (
          <EmptyState
            title="No applications received yet"
            description="When candidates apply to your open jobs, their applications, resumes, and status controls will appear here."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Candidate</th>
                    <th className="px-5 py-3.5">Job Opening</th>
                    <th className="px-5 py-3.5">Applied</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Quick Update</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((item) => {
                    const isBusy = busyApplicationId === item.applicationId;
                    return (
                      <tr
                        key={item.applicationId}
                        className="hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {item.candidateName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.candidateEmail} &middot;{' '}
                            {item.yearsOfExperience} yr exp
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            to={`/jobs/${item.jobId}`}
                            className="font-medium text-slate-900 hover:text-indigo-600"
                          >
                            {item.jobTitle}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {item.department}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500">
                          {formatShortDate(item.appliedAt)}
                        </td>

                        <td className="px-5 py-4">
                          <ApplicationStatusBadge
                            applicationStatus={item.applicationStatus}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <select
                            aria-label={`Update status for ${item.candidateName}`}
                            value={item.applicationStatus}
                            disabled={isBusy}
                            onChange={(event) =>
                              void handleQuickStatusChange(
                                item.applicationId,
                                event.target.value as HireTrackApplicationStatus
                              )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                          >
                            {ALL_APPLICATION_STATUSES.map((statusOption) => (
                              <option key={statusOption} value={statusOption}>
                                {formatApplicationStatusName(statusOption)}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-2">
                            {item.resumeSnapshotUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleOpenResume(
                                    item.resumeSnapshotUrl as string
                                  )
                                }
                                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                Resume
                              </button>
                            )}
                            <Link
                              to={`/applications/${item.applicationId}`}
                              className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                            >
                              Details
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
