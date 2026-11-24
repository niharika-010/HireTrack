import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApplicationStatusBadge } from '../components/applications/ApplicationStatusBadge';
import { JobApplicationForm } from '../components/applications/JobApplicationForm';
import { FormAlert } from '../components/forms/FormAlert';
import { FormButton } from '../components/forms/FormButton';
import { JobStatusBadge } from '../components/jobs/JobStatusBadge';
import { LoadingState } from '../components/LoadingState';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import {
  fetchMyApplications,
  submitJobApplication,
} from '../services/applicationService';
import { fetchCandidateProfile } from '../services/candidateService';
import {
  closeJobOpening,
  deleteJobOpening,
  fetchJobDetails,
} from '../services/jobService';
import type { ApplicationSummary } from '../types/application';
import type { CandidateProfile } from '../types/candidate';
import type { JobOpening } from '../types/job';
import {
  formatEmploymentTypeLabel,
  formatSalaryRange,
  formatShortDate,
} from '../utils/jobHelpers';

/**
 * Detailed view of a single job opening loaded from GET /api/jobs/:id.
 * Candidates can apply directly to open jobs (with automatic duplicate detection).
 */
export function JobDetailsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { apiBaseUrl } = useAppConfig();
  const { authToken, currentUser } = useAuth();

  const parsedJobId = Number(jobId);
  const isValidJobId = Number.isInteger(parsedJobId) && parsedJobId > 0;
  const isCandidate = currentUser?.userRole === 'candidate';

  const [jobDetails, setJobDetails] = useState<JobOpening | null>(null);
  const [candidateProfile, setCandidateProfile] =
    useState<CandidateProfile | null>(null);
  const [existingApplication, setExistingApplication] =
    useState<ApplicationSummary | null>(null);

  const [isLoadingDetails, setIsLoadingDetails] =
    useState<boolean>(isValidJobId);
  const [pageError, setPageError] = useState<string | null>(
    isValidJobId ? null : 'Invalid job ID.'
  );
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState<boolean>(false);

  const [isSubmittingApplication, setIsSubmittingApplication] =
    useState<boolean>(false);
  const [applicationError, setApplicationError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken || !isValidJobId) {
      return;
    }

    let isCancelled = false;

    const jobPromise = fetchJobDetails(apiBaseUrl, authToken, parsedJobId);
    const candidateExtrasPromise = isCandidate
      ? Promise.all([
          fetchCandidateProfile(apiBaseUrl, authToken).catch(() => null),
          fetchMyApplications(apiBaseUrl, authToken, {
            jobId: parsedJobId,
          }).catch(() => null),
        ])
      : Promise.resolve([null, null] as const);

    Promise.all([jobPromise, candidateExtrasPromise])
      .then(([jobResponse, [profileResponse, myAppsResponse]]) => {
        if (!isCancelled) {
          setJobDetails(jobResponse.job);
          if (profileResponse) {
            setCandidateProfile(profileResponse.profile);
          }
          if (myAppsResponse && myAppsResponse.applications.length > 0) {
            setExistingApplication(myAppsResponse.applications[0]);
          }
          setPageError(null);
          setIsLoadingDetails(false);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load job details.';
          setPageError(message);
          setIsLoadingDetails(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken, parsedJobId, isValidJobId, isCandidate]);

  const backLinkPath =
    currentUser?.userRole === 'recruiter'
      ? '/recruiter/jobs'
      : currentUser?.userRole === 'admin'
        ? '/admin/jobs'
        : '/jobs';

  async function handleCloseCurrentJob() {
    if (!authToken || !jobDetails) {
      return;
    }

    setIsMutating(true);
    setPageError(null);
    setActionSuccess(null);

    try {
      const response = await closeJobOpening(
        apiBaseUrl,
        authToken,
        jobDetails.jobId
      );
      setJobDetails(response.job);
      setActionSuccess('Job opening has been closed.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to close job opening.';
      setPageError(message);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeleteCurrentJob() {
    if (!authToken || !jobDetails) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete "${jobDetails.jobTitle}"?`
    );
    if (!confirmed) {
      return;
    }

    setIsMutating(true);
    setPageError(null);

    try {
      await deleteJobOpening(apiBaseUrl, authToken, jobDetails.jobId);
      navigate(backLinkPath, { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to delete job opening.';
      setPageError(message);
      setIsMutating(false);
    }
  }

  /**
   * Submits a candidate application to POST /api/applications and switches the card to the submitted state.
   */
  async function handleSubmitApplication(coverLetter: string | null) {
    if (!authToken || !jobDetails) {
      return;
    }

    setIsSubmittingApplication(true);
    setApplicationError(null);

    try {
      const response = await submitJobApplication(apiBaseUrl, authToken, {
        jobId: jobDetails.jobId,
        coverLetter,
      });
      setExistingApplication(response.application);
      setActionSuccess(response.message);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to submit your application.';
      setApplicationError(message);
    } finally {
      setIsSubmittingApplication(false);
    }
  }

  return (
    <DashboardLayout pageTitle="Job Details">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link
            to={backLinkPath}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            &larr; Back to jobs
          </Link>
        </div>

        {pageError && <FormAlert variant="error" message={pageError} />}
        {actionSuccess && (
          <FormAlert variant="success" message={actionSuccess} />
        )}

        {isLoadingDetails ? (
          <LoadingState message="Loading job details..." />
        ) : jobDetails ? (
          <>
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <JobStatusBadge jobStatus={jobDetails.jobStatus} />
                    <span className="text-xs font-medium text-slate-500">
                      Posted {formatShortDate(jobDetails.createdAt)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">
                    {jobDetails.jobTitle}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {jobDetails.companyName} &middot; {jobDetails.department}
                  </p>
                </div>

                {(currentUser?.userRole === 'recruiter' ||
                  currentUser?.userRole === 'admin') && (
                  <div className="flex flex-wrap gap-2">
                    {currentUser.userRole === 'recruiter' && (
                      <Link
                        to={`/recruiter/jobs/${jobDetails.jobId}/edit`}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        Edit Job
                      </Link>
                    )}
                    {jobDetails.jobStatus !== 'closed' && (
                      <FormButton
                        variant="secondary"
                        isLoading={isMutating}
                        loadingLabel="Closing..."
                        onClick={() => void handleCloseCurrentJob()}
                      >
                        Close Job
                      </FormButton>
                    )}
                    <FormButton
                      variant="danger"
                      isLoading={isMutating}
                      loadingLabel="Deleting..."
                      onClick={() => void handleDeleteCurrentJob()}
                    >
                      Delete
                    </FormButton>
                  </div>
                )}
              </div>

              {/* Key job metadata */}
              <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Location
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {jobDetails.jobLocation}
                  </dd>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Employment Type
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {formatEmploymentTypeLabel(jobDetails.employmentType)}
                  </dd>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Salary Range
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {formatSalaryRange(
                      jobDetails.salaryMin,
                      jobDetails.salaryMax
                    )}
                  </dd>
                </div>
              </dl>

              <section className="mt-8 space-y-2">
                <h3 className="text-base font-semibold text-slate-900">
                  Job Description
                </h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {jobDetails.jobDescription}
                </p>
              </section>

              {jobDetails.requirements && (
                <section className="mt-6 space-y-2 border-t border-slate-100 pt-6">
                  <h3 className="text-base font-semibold text-slate-900">
                    Qualifications &amp; Requirements
                  </h3>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {jobDetails.requirements}
                  </p>
                </section>
              )}
            </article>

            {/* Candidate Application Section */}
            {isCandidate && jobDetails.jobStatus === 'open' && (
              existingApplication ? (
                <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-6">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-semibold text-emerald-950">
                        You have already applied for this role
                      </h3>
                      <ApplicationStatusBadge
                        applicationStatus={
                          existingApplication.applicationStatus
                        }
                      />
                    </div>
                    <p className="mt-1 text-sm text-emerald-800">
                      Submitted on {formatShortDate(existingApplication.appliedAt)}.
                      Track recruiter updates on your application details page.
                    </p>
                  </div>
                  <Link
                    to={`/applications/${existingApplication.applicationId}`}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    Track Application
                  </Link>
                </section>
              ) : (
                <JobApplicationForm
                  jobTitle={jobDetails.jobTitle}
                  candidateProfile={candidateProfile}
                  isSubmitting={isSubmittingApplication}
                  submitError={applicationError}
                  onSubmitApplication={handleSubmitApplication}
                />
              )
            )}
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
