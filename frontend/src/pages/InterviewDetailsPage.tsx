import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FormAlert } from '../components/forms/FormAlert';
import {
  InterviewResultBadge,
  InterviewRoundBadge,
  InterviewStatusBadge,
} from '../components/interviews/InterviewBadges';
import { InterviewFeedbackForm } from '../components/interviews/InterviewFeedbackForm';
import { LoadingState } from '../components/LoadingState';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import {
  fetchInterviewDetails,
  recordInterviewFeedback,
} from '../services/interviewService';
import type {
  InterviewRecord,
  RecordInterviewFeedbackPayload,
} from '../types/interview';
import { formatDateTime } from '../utils/applicationHelpers';
import { formatInterviewModeLabel } from '../utils/interviewHelpers';

/**
 * Detailed view of a scheduled or completed interview, including recruiter feedback recording.
 */
export function InterviewDetailsPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { apiBaseUrl } = useAppConfig();
  const { authToken, currentUser } = useAuth();

  const parsedInterviewId = Number(interviewId);
  const isValidId =
    Number.isInteger(parsedInterviewId) && parsedInterviewId > 0;
  const isRecruiter = currentUser?.userRole === 'recruiter';

  const [interview, setInterview] = useState<InterviewRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isValidId);
  const [pageError, setPageError] = useState<string | null>(
    isValidId ? null : 'Invalid interview ID.'
  );

  const [isSavingFeedback, setIsSavingFeedback] = useState<boolean>(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken || !isValidId) {
      return;
    }

    let isCancelled = false;

    fetchInterviewDetails(apiBaseUrl, authToken, parsedInterviewId)
      .then((response) => {
        if (!isCancelled) {
          setInterview(response.interview);
          setPageError(null);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load interview details.';
          setPageError(message);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken, parsedInterviewId, isValidId]);

  async function handleSubmitFeedback(payload: RecordInterviewFeedbackPayload) {
    if (!authToken || !interview) {
      return;
    }

    setIsSavingFeedback(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      const response = await recordInterviewFeedback(
        apiBaseUrl,
        authToken,
        interview.interviewId,
        payload
      );
      setInterview(response.interview);
      setFeedbackSuccess(response.message);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to save interview feedback.';
      setFeedbackError(message);
    } finally {
      setIsSavingFeedback(false);
    }
  }

  return (
    <DashboardLayout pageTitle="Interview Details">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/interviews/upcoming"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            &larr; Back to interviews
          </Link>

          {interview && (
            <Link
              to={`/applications/${interview.applicationId}`}
              className="text-sm font-semibold text-slate-600 hover:text-indigo-600"
            >
              View Linked Application &rarr;
            </Link>
          )}
        </div>

        {pageError && <FormAlert variant="error" message={pageError} />}

        {isLoading ? (
          <LoadingState message="Loading interview details..." />
        ) : interview ? (
          <>
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <InterviewRoundBadge
                      interviewRound={interview.interviewRound}
                    />
                    <InterviewStatusBadge
                      interviewStatus={interview.interviewStatus}
                    />
                    <InterviewResultBadge
                      interviewResult={interview.interviewResult}
                    />
                  </div>
                  <h2 className="mt-2.5 text-2xl font-bold text-slate-900">
                    {interview.jobTitle}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {interview.companyName} &middot; {interview.department}
                  </p>
                </div>

                {isRecruiter && (
                  <Link
                    to={`/recruiter/interviews/${interview.interviewId}/edit`}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    Edit / Reschedule
                  </Link>
                )}
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Date &amp; Time
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDateTime(interview.interviewDate)}
                  </dd>
                  <dd className="text-xs text-slate-500">
                    {interview.durationMinutes} minutes
                  </dd>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Candidate
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {interview.candidateName}
                  </dd>
                  <dd className="text-xs text-slate-500">
                    {interview.candidateEmail}
                  </dd>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Interviewer
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {interview.interviewerName}
                  </dd>
                  <dd className="text-xs text-slate-500">
                    {interview.interviewerEmail ?? 'No email listed'}
                  </dd>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Mode &amp; Link
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {formatInterviewModeLabel(interview.interviewMode)}
                  </dd>
                  <dd className="truncate text-xs text-indigo-600">
                    {interview.meetingLink ? (
                      interview.meetingLink.startsWith('http') ? (
                        <a
                          href={interview.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          Join Meeting
                        </a>
                      ) : (
                        interview.meetingLink
                      )
                    ) : (
                      <span className="text-slate-500">Not specified</span>
                    )}
                  </dd>
                </div>
              </dl>

              {interview.interviewerNotes && (
                <section className="mt-6 border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Preparation Notes &amp; Agenda
                  </h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                    {interview.interviewerNotes}
                  </p>
                </section>
              )}

              {interview.interviewFeedback && (
                <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50/50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-emerald-950">
                      Recorded Interview Feedback
                    </h3>
                    <div className="flex items-center gap-2">
                      {interview.interviewRating !== null && (
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-slate-800 ring-1 ring-slate-200">
                          Rating: {interview.interviewRating} / 5
                        </span>
                      )}
                      <InterviewResultBadge
                        interviewResult={interview.interviewResult}
                      />
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-800">
                    {interview.interviewFeedback}
                  </p>
                  {interview.feedbackSubmittedAt && (
                    <p className="mt-2 text-xs text-slate-500">
                      Recorded on {formatDateTime(interview.feedbackSubmittedAt)}
                    </p>
                  )}
                </section>
              )}
            </article>

            {/* Recruiter Feedback & Result Form */}
            {isRecruiter && (
              <InterviewFeedbackForm
                interview={interview}
                isSubmitting={isSavingFeedback}
                serverError={feedbackError}
                successMessage={feedbackSuccess}
                onSubmitFeedback={handleSubmitFeedback}
              />
            )}
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
