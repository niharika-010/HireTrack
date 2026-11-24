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
import { fetchJobOpenings } from '../services/jobService';
import type { JobFilterParams, JobOpening } from '../types/job';
import {
  formatEmploymentTypeLabel,
  formatSalaryRange,
  formatShortDate,
} from '../utils/jobHelpers';

const INITIAL_BROWSE_FILTERS: JobFilterParams = {
  search: '',
  jobLocation: '',
  employmentType: '',
};

/**
 * Candidate-focused job board showing active ("open") job openings with search and filtering.
 */
export function BrowseJobsPage() {
  const { apiBaseUrl } = useAppConfig();
  const { authToken } = useAuth();

  const [draftFilters, setDraftFilters] = useState<JobFilterParams>(
    INITIAL_BROWSE_FILTERS
  );
  const [appliedFilters, setAppliedFilters] = useState<JobFilterParams>(
    INITIAL_BROWSE_FILTERS
  );
  const [activeJobs, setActiveJobs] = useState<JobOpening[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    let isCancelled = false;

    fetchJobOpenings(apiBaseUrl, authToken, appliedFilters)
      .then((response) => {
        if (!isCancelled) {
          setActiveJobs(response.jobs);
          setPageError(null);
          setIsLoadingJobs(false);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load open jobs.';
          setPageError(message);
          setIsLoadingJobs(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken, appliedFilters]);

  const reloadJobs = useCallback(
    async (nextFilters: JobFilterParams) => {
      if (!authToken) {
        return;
      }

      setIsLoadingJobs(true);
      setPageError(null);

      try {
        const response = await fetchJobOpenings(
          apiBaseUrl,
          authToken,
          nextFilters
        );
        setActiveJobs(response.jobs);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to load open jobs.';
        setPageError(message);
      } finally {
        setIsLoadingJobs(false);
      }
    },
    [apiBaseUrl, authToken]
  );

  function handleApplyFilters() {
    setAppliedFilters(draftFilters);
    void reloadJobs(draftFilters);
  }

  function handleResetFilters() {
    setDraftFilters(INITIAL_BROWSE_FILTERS);
    setAppliedFilters(INITIAL_BROWSE_FILTERS);
    void reloadJobs(INITIAL_BROWSE_FILTERS);
  }

  return (
    <DashboardLayout pageTitle="Browse Open Jobs">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Explore active opportunities
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Search by keyword, location, or employment type. Only active open
            positions are shown.
          </p>
        </div>

        <JobFilterBar
          filters={draftFilters}
          onFiltersChange={setDraftFilters}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
        />

        {pageError && <FormAlert variant="error" message={pageError} />}

        {isLoadingJobs ? (
          <LoadingState message="Searching open job listings..." />
        ) : activeJobs.length === 0 ? (
          <EmptyState
            title="No matching open jobs"
            description="No active job openings match your search right now. Try clearing filters or checking back soon."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeJobs.map((jobOpening) => (
              <article
                key={jobOpening.jobId}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-indigo-300"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                      {jobOpening.companyName}
                    </span>
                    <JobStatusBadge jobStatus={jobOpening.jobStatus} />
                  </div>

                  <h3 className="mt-2 text-lg font-bold text-slate-900">
                    <Link
                      to={`/jobs/${jobOpening.jobId}`}
                      className="hover:text-indigo-600"
                    >
                      {jobOpening.jobTitle}
                    </Link>
                  </h3>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {jobOpening.department} &middot; {jobOpening.jobLocation}{' '}
                    &middot;{' '}
                    {formatEmploymentTypeLabel(jobOpening.employmentType)}
                  </p>

                  <p className="mt-3 line-clamp-3 text-sm text-slate-600">
                    {jobOpening.jobDescription}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      {formatSalaryRange(
                        jobOpening.salaryMin,
                        jobOpening.salaryMax
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Posted {formatShortDate(jobOpening.createdAt)}
                    </p>
                  </div>

                  <Link
                    to={`/jobs/${jobOpening.jobId}`}
                    className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    View Details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
