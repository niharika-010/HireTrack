import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { FormAlert } from '../components/forms/FormAlert';
import { JobFilterBar } from '../components/jobs/JobFilterBar';
import { JobStatusBadge } from '../components/jobs/JobStatusBadge';
import { LoadingState } from '../components/LoadingState';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import {
  closeJobOpening,
  deleteJobOpening,
  fetchJobOpenings,
} from '../services/jobService';
import type { JobFilterParams, JobOpening } from '../types/job';
import {
  formatEmploymentTypeLabel,
  formatSalaryRange,
  formatShortDate,
} from '../utils/jobHelpers';

export interface ManageJobsPageProps {
  scope: 'recruiter' | 'admin';
}

const INITIAL_FILTERS: JobFilterParams = {
  search: '',
  jobLocation: '',
  employmentType: '',
  jobStatus: '',
};

/**
 * Job management page for Recruiters (own openings) and Admins (all platform openings).
 * Supports searching, filtering, viewing, editing, closing, and deleting real PostgreSQL jobs.
 */
export function ManageJobsPage({ scope }: ManageJobsPageProps) {
  const { apiBaseUrl } = useAppConfig();
  const { authToken } = useAuth();
  const isRecruiterScope = scope === 'recruiter';

  const [draftFilters, setDraftFilters] =
    useState<JobFilterParams>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<JobFilterParams>(INITIAL_FILTERS);
  const [jobList, setJobList] = useState<JobOpening[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyJobId, setBusyJobId] = useState<number | null>(null);

  // Load jobs whenever applied filters change.
  useEffect(() => {
    if (!authToken) {
      return;
    }

    let isCancelled = false;

    fetchJobOpenings(apiBaseUrl, authToken, {
      ...appliedFilters,
      mine: isRecruiterScope,
    })
      .then((response) => {
        if (!isCancelled) {
          setJobList(response.jobs);
          setPageError(null);
          setIsLoadingJobs(false);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load job openings.';
          setPageError(message);
          setIsLoadingJobs(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken, appliedFilters, isRecruiterScope]);

  const reloadJobs = useCallback(
    async (nextFilters: JobFilterParams) => {
      if (!authToken) {
        return;
      }

      setIsLoadingJobs(true);
      setPageError(null);

      try {
        const response = await fetchJobOpenings(apiBaseUrl, authToken, {
          ...nextFilters,
          mine: isRecruiterScope,
        });
        setJobList(response.jobs);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load job openings.';
        setPageError(message);
      } finally {
        setIsLoadingJobs(false);
      }
    },
    [apiBaseUrl, authToken, isRecruiterScope]
  );

  function handleApplyFilters() {
    setAppliedFilters(draftFilters);
    void reloadJobs(draftFilters);
  }

  function handleResetFilters() {
    setDraftFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    void reloadJobs(INITIAL_FILTERS);
  }

  /**
   * Calls PATCH /api/jobs/:id/close and updates the row in place.
   */
  async function handleCloseJob(jobId: number) {
    if (!authToken) {
      return;
    }

    setBusyJobId(jobId);
    setPageError(null);
    setActionMessage(null);

    try {
      const response = await closeJobOpening(apiBaseUrl, authToken, jobId);
      setJobList((previousJobs) =>
        previousJobs.map((item) =>
          item.jobId === jobId ? response.job : item
        )
      );
      setActionMessage(`Closed "${response.job.jobTitle}".`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to close job.';
      setPageError(message);
    } finally {
      setBusyJobId(null);
    }
  }

  /**
   * Calls DELETE /api/jobs/:id and removes the job from the list.
   */
  async function handleDeleteJob(jobOpening: JobOpening) {
    if (!authToken) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete "${jobOpening.jobTitle}"? This action cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setBusyJobId(jobOpening.jobId);
    setPageError(null);
    setActionMessage(null);

    try {
      await deleteJobOpening(apiBaseUrl, authToken, jobOpening.jobId);
      setJobList((previousJobs) =>
        previousJobs.filter((item) => item.jobId !== jobOpening.jobId)
      );
      setActionMessage(`Deleted "${jobOpening.jobTitle}".`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to delete job.';
      setPageError(message);
    } finally {
      setBusyJobId(null);
    }
  }

  return (
    <DashboardLayout
      pageTitle={isRecruiterScope ? 'Manage Jobs' : 'All Job Listings'}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isRecruiterScope ? 'Your Job Openings' : 'Platform Job Listings'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {isRecruiterScope
                ? 'Create, edit, close, or delete the job openings you manage.'
                : 'Review and moderate all job openings across HireTrack.'}
            </p>
          </div>

          {isRecruiterScope && (
            <Link
              to="/recruiter/jobs/new"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              + Create Job
            </Link>
          )}
        </div>

        <JobFilterBar
          filters={draftFilters}
          showStatusFilter
          onFiltersChange={setDraftFilters}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
        />

        {pageError && <FormAlert variant="error" message={pageError} />}
        {actionMessage && (
          <FormAlert variant="success" message={actionMessage} />
        )}

        {isLoadingJobs ? (
          <LoadingState message="Loading job openings..." />
        ) : jobList.length === 0 ? (
          <EmptyState
            title="No job openings found"
            description={
              isRecruiterScope
                ? 'You have no job openings matching these filters yet. Publish your first opening to start attracting candidates.'
                : 'No job openings match the selected search or filter criteria.'
            }
            action={
              isRecruiterScope ? (
                <Link
                  to="/recruiter/jobs/new"
                  className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Create Your First Job
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Role &amp; Department</th>
                    <th className="px-5 py-3.5">Location &amp; Type</th>
                    <th className="px-5 py-3.5">Compensation</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Posted</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobList.map((jobOpening) => {
                    const isRowBusy = busyJobId === jobOpening.jobId;
                    return (
                      <tr
                        key={jobOpening.jobId}
                        className="hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <Link
                            to={`/jobs/${jobOpening.jobId}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600"
                          >
                            {jobOpening.jobTitle}
                          </Link>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {jobOpening.department} &middot;{' '}
                            {jobOpening.companyName}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-slate-800">
                            {jobOpening.jobLocation}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatEmploymentTypeLabel(
                              jobOpening.employmentType
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {formatSalaryRange(
                            jobOpening.salaryMin,
                            jobOpening.salaryMax
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <JobStatusBadge jobStatus={jobOpening.jobStatus} />
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500">
                          {formatShortDate(jobOpening.createdAt)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-2">
                            <Link
                              to={`/jobs/${jobOpening.jobId}`}
                              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              View
                            </Link>

                            {isRecruiterScope && (
                              <Link
                                to={`/recruiter/jobs/${jobOpening.jobId}/edit`}
                                className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                              >
                                Edit
                              </Link>
                            )}

                            {jobOpening.jobStatus !== 'closed' && (
                              <button
                                type="button"
                                disabled={isRowBusy}
                                onClick={() =>
                                  void handleCloseJob(jobOpening.jobId)
                                }
                                className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                              >
                                Close
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isRowBusy}
                              onClick={() => void handleDeleteJob(jobOpening)}
                              className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                            >
                              Delete
                            </button>
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
