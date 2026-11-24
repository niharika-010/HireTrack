import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApplicationStatusBadge } from '../components/applications/ApplicationStatusBadge';
import { ApplicationStatusTracker } from '../components/applications/ApplicationStatusTracker';
import { FormAlert } from '../components/forms/FormAlert';
import { FormButton } from '../components/forms/FormButton';
import { FormSelect } from '../components/forms/FormSelect';
import type { SelectOptionItem } from '../components/forms/FormSelect';
import { FormTextarea } from '../components/forms/FormTextarea';
import { LoadingState } from '../components/LoadingState';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import {
  fetchApplicationDetails,
  updateApplicationStatus,
} from '../services/applicationService';
import { openAuthenticatedResume } from '../services/candidateService';
import type {
  ApplicationDetail,
  HireTrackApplicationStatus,
} from '../types/application';
import {
  ALL_APPLICATION_STATUSES,
  formatApplicationStatusName,
  formatDateTime,
} from '../utils/applicationHelpers';
import { formatEmploymentTypeLabel } from '../utils/jobHelpers';

const STATUS_SELECT_OPTIONS: SelectOptionItem[] = ALL_APPLICATION_STATUSES.map(
  (status) => ({
    value: status,
    label: formatApplicationStatusName(status),
  })
);

/**
 * Shared Application Details page for Candidates (status tracking) and Recruiters (review + status update).
 */
export function ApplicationDetailsPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { apiBaseUrl } = useAppConfig();
  const { authToken, currentUser } = useAuth();

  const parsedApplicationId = Number(applicationId);
  const isValidId =
    Number.isInteger(parsedApplicationId) && parsedApplicationId > 0;

  const [applicationDetail, setApplicationDetail] =
    useState<ApplicationDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isValidId);
  const [pageError, setPageError] = useState<string | null>(
    isValidId ? null : 'Invalid application ID.'
  );

  // Recruiter status update form state
  const [nextStatus, setNextStatus] =
    useState<HireTrackApplicationStatus>('under_review');
  const [statusNote, setStatusNote] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusUpdateMessage, setStatusUpdateMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!authToken || !isValidId) {
      return;
    }

    let isCancelled = false;

    fetchApplicationDetails(apiBaseUrl, authToken, parsedApplicationId)
      .then((response) => {
        if (!isCancelled) {
          setApplicationDetail(response.application);
          setNextStatus(response.application.applicationStatus);
          setPageError(null);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load application details.';
          setPageError(message);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken, parsedApplicationId, isValidId]);

  const backLinkPath =
    currentUser?.userRole === 'recruiter'
      ? '/recruiter/applications'
      : '/candidate/applications';

  async function handleOpenResume() {
    if (!authToken || !applicationDetail?.resumeSnapshotUrl) {
      return;
    }

    setPageError(null);

    try {
      await openAuthenticatedResume(
        applicationDetail.resumeSnapshotUrl,
        authToken
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to open resume.';
      setPageError(message);
    }
  }

  async function handleStatusUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authToken || !applicationDetail) {
      return;
    }

    setIsUpdatingStatus(true);
    setPageError(null);
    setStatusUpdateMessage(null);

    try {
      const trimmedNote = statusNote.trim();
      const response = await updateApplicationStatus(
        apiBaseUrl,
        authToken,
        applicationDetail.applicationId,
        {
          applicationStatus: nextStatus,
          statusNote: trimmedNote.length > 0 ? trimmedNote : null,
        }
      );

      setApplicationDetail(response.application);
      setStatusNote('');
      setStatusUpdateMessage(
        `Status updated to ${formatApplicationStatusName(response.application.applicationStatus)}.`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update application status.';
      setPageError(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  return (
    <DashboardLayout pageTitle="Application Details">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link
            to={backLinkPath}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            &larr; Back to applications
          </Link>
        </div>

        {pageError && <FormAlert variant="error" message={pageError} />}
        {statusUpdateMessage && (
          <FormAlert variant="success" message={statusUpdateMessage} />
        )}

        {isLoading ? (
          <LoadingState message="Loading application details..." />
        ) : applicationDetail ? (
          <>
            {/* Application Header Card */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <ApplicationStatusBadge
                      applicationStatus={applicationDetail.applicationStatus}
                    />
                    <span className="text-xs text-slate-500">
                      Submitted {formatDateTime(applicationDetail.appliedAt)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">
                    {applicationDetail.jobTitle}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {applicationDetail.companyName} &middot;{' '}
                    {applicationDetail.department} &middot;{' '}
                    {applicationDetail.jobLocation} &middot;{' '}
                    {formatEmploymentTypeLabel(
                      applicationDetail.employmentType
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {currentUser?.userRole === 'recruiter' &&
                    applicationDetail.applicationStatus !== 'rejected' && (
                      <Link
                        to={`/recruiter/interviews/new?applicationId=${applicationDetail.applicationId}`}
                        className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        Schedule Interview
                      </Link>
                    )}
                  {applicationDetail.resumeSnapshotUrl && (
                    <FormButton
                      variant="secondary"
                      onClick={() => void handleOpenResume()}
                    >
                      View Attached Resume
                    </FormButton>
                  )}
                </div>
              </div>

              {/* Candidate Info */}
              <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Candidate
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {applicationDetail.candidateName}
                  </dd>
                  <dd className="text-xs text-slate-600">
                    {applicationDetail.candidateEmail}
                  </dd>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Experience &amp; Location
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {applicationDetail.yearsOfExperience} year
                    {applicationDetail.yearsOfExperience === 1 ? '' : 's'}
                  </dd>
                  <dd className="text-xs text-slate-600">
                    {applicationDetail.candidateLocation ?? 'Location not set'}
                  </dd>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Phone &amp; Resume
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {applicationDetail.candidatePhone ?? 'Phone not set'}
                  </dd>
                  <dd className="truncate text-xs text-slate-600">
                    {applicationDetail.resumeFileName ??
                      (applicationDetail.resumeSnapshotUrl
                        ? 'Resume attached'
                        : 'No resume attached')}
                  </dd>
                </div>
              </dl>

              {applicationDetail.skillsSummary && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Candidate Skills
                  </h3>
                  <p className="mt-1 text-sm text-slate-700">
                    {applicationDetail.skillsSummary}
                  </p>
                </div>
              )}

              {applicationDetail.coverLetter && (
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Cover Letter
                  </h3>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {applicationDetail.coverLetter}
                  </p>
                </div>
              )}
            </section>

            {/* Recruiter Status Update Panel */}
            {currentUser?.userRole === 'recruiter' && (
              <form
                onSubmit={(event) => void handleStatusUpdateSubmit(event)}
                className="space-y-4 rounded-xl border border-indigo-200 bg-white p-6 shadow-xs"
              >
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Update Application Status
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Move this candidate through the hiring stages. Every update
                    is logged in the application history below.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormSelect
                    selectId="update-application-status"
                    label="New Status"
                    value={nextStatus}
                    options={STATUS_SELECT_OPTIONS}
                    onValueChange={(val) =>
                      setNextStatus(val as HireTrackApplicationStatus)
                    }
                    isRequired
                    isDisabled={isUpdatingStatus}
                  />
                </div>

                <FormTextarea
                  textareaId="status-update-note"
                  label="Recruiter Note (optional)"
                  rows={3}
                  value={statusNote}
                  onValueChange={setStatusNote}
                  placeholder="e.g. Strong Rust background — moving to technical interview..."
                  isDisabled={isUpdatingStatus}
                />

                <div className="flex justify-end">
                  <FormButton
                    buttonType="submit"
                    isLoading={isUpdatingStatus}
                    loadingLabel="Updating status..."
                  >
                    Save Status Update
                  </FormButton>
                </div>
              </form>
            )}

            {/* Candidate Status Tracker & Full History */}
            <ApplicationStatusTracker
              currentStatus={applicationDetail.applicationStatus}
              history={applicationDetail.history}
            />
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
