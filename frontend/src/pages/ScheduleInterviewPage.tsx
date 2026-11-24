import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { FormAlert } from '../components/forms/FormAlert';
import { InterviewScheduleForm } from '../components/interviews/InterviewScheduleForm';
import type { InterviewScheduleFormValues } from '../components/interviews/InterviewScheduleForm';
import { LoadingState } from '../components/LoadingState';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { fetchRecruiterApplications } from '../services/applicationService';
import {
  fetchInterviewDetails,
  scheduleInterview,
  updateInterviewDetails,
} from '../services/interviewService';
import type { ApplicationSummary } from '../types/application';
import type { InterviewRecord } from '../types/interview';

export interface ScheduleInterviewPageProps {
  mode: 'create' | 'edit';
}

/**
 * Recruiter page for scheduling a new Technical/HR interview (POST /api/interviews)
 * or editing/rescheduling an existing interview (PUT /api/interviews/:id).
 */
export function ScheduleInterviewPage({ mode }: ScheduleInterviewPageProps) {
  const { interviewId } = useParams<{ interviewId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { apiBaseUrl } = useAppConfig();
  const { authToken } = useAuth();

  const parsedInterviewId = Number(interviewId);
  const preselectedApplicationId = Number(searchParams.get('applicationId') ?? '0');

  const [eligibleApplications, setEligibleApplications] = useState<
    ApplicationSummary[]
  >([]);
  const [existingInterview, setExistingInterview] =
    useState<InterviewRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    let isCancelled = false;

    if (mode === 'create') {
      fetchRecruiterApplications(apiBaseUrl, authToken)
        .then((response) => {
          if (!isCancelled) {
            const nonRejected = response.applications.filter(
              (item) => item.applicationStatus !== 'rejected'
            );
            setEligibleApplications(nonRejected);
            setLoadError(null);
            setIsLoading(false);
          }
        })
        .catch((error) => {
          if (!isCancelled) {
            const message =
              error instanceof Error
                ? error.message
                : 'Unable to load candidate applications.';
            setLoadError(message);
            setIsLoading(false);
          }
        });
    } else {
      fetchInterviewDetails(apiBaseUrl, authToken, parsedInterviewId)
        .then((response) => {
          if (!isCancelled) {
            setExistingInterview(response.interview);
            setLoadError(null);
            setIsLoading(false);
          }
        })
        .catch((error) => {
          if (!isCancelled) {
            const message =
              error instanceof Error
                ? error.message
                : 'Unable to load interview for editing.';
            setLoadError(message);
            setIsLoading(false);
          }
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken, mode, parsedInterviewId]);

  async function handleSubmitSchedule(values: InterviewScheduleFormValues) {
    if (!authToken) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        const response = await scheduleInterview(apiBaseUrl, authToken, {
          applicationId: values.applicationId,
          interviewerName: values.interviewerName,
          interviewerEmail: values.interviewerEmail,
          interviewRound: values.interviewRound,
          interviewDate: values.interviewDate,
          durationMinutes: values.durationMinutes,
          interviewMode: values.interviewMode,
          meetingLink: values.meetingLink,
          interviewerNotes: values.interviewerNotes,
        });
        navigate(`/interviews/${response.interview.interviewId}`, {
          replace: true,
        });
      } else {
        const response = await updateInterviewDetails(
          apiBaseUrl,
          authToken,
          parsedInterviewId,
          {
            interviewerName: values.interviewerName,
            interviewerEmail: values.interviewerEmail,
            interviewRound: values.interviewRound,
            interviewDate: values.interviewDate,
            durationMinutes: values.durationMinutes,
            interviewMode: values.interviewMode,
            meetingLink: values.meetingLink,
            interviewStatus: values.interviewStatus,
            interviewerNotes: values.interviewerNotes,
          }
        );
        navigate(`/interviews/${response.interview.interviewId}`, {
          replace: true,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to save interview schedule.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DashboardLayout
      pageTitle={mode === 'create' ? 'Schedule Interview' : 'Edit Interview'}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            to="/interviews/upcoming"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            &larr; Back to upcoming interviews
          </Link>
        </div>

        {loadError && <FormAlert variant="error" message={loadError} />}

        {isLoading ? (
          <LoadingState
            message={
              mode === 'create'
                ? 'Loading eligible applications...'
                : 'Loading interview details...'
            }
          />
        ) : mode === 'create' && eligibleApplications.length === 0 ? (
          <EmptyState
            title="No eligible candidate applications yet"
            description="Once candidates apply to your open jobs, you can schedule Technical and HR interview rounds here."
            action={
              <Link
                to="/recruiter/applications"
                className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                View Applications
              </Link>
            }
          />
        ) : mode === 'create' ? (
          <>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Schedule a Technical or HR Interview
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Scheduling automatically updates the candidate&apos;s application
                status to Interview Scheduled.
              </p>
            </div>

            <InterviewScheduleForm
              mode="create"
              availableApplications={eligibleApplications}
              initialValues={{
                applicationId:
                  preselectedApplicationId > 0
                    ? preselectedApplicationId
                    : eligibleApplications[0].applicationId,
              }}
              isSubmitting={isSubmitting}
              serverError={submitError}
              onSubmitSchedule={handleSubmitSchedule}
              onCancel={() => navigate('/interviews/upcoming')}
            />
          </>
        ) : existingInterview ? (
          <>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Edit Interview — {existingInterview.candidateName}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {existingInterview.jobTitle} &middot;{' '}
                {existingInterview.companyName}
              </p>
            </div>

            <InterviewScheduleForm
              mode="edit"
              initialValues={{
                applicationId: existingInterview.applicationId,
                interviewerName: existingInterview.interviewerName,
                interviewerEmail: existingInterview.interviewerEmail,
                interviewRound: existingInterview.interviewRound,
                interviewDate: existingInterview.interviewDate,
                durationMinutes: existingInterview.durationMinutes,
                interviewMode: existingInterview.interviewMode,
                meetingLink: existingInterview.meetingLink,
                interviewStatus: existingInterview.interviewStatus,
                interviewerNotes: existingInterview.interviewerNotes,
              }}
              isSubmitting={isSubmitting}
              serverError={submitError}
              onSubmitSchedule={handleSubmitSchedule}
              onCancel={() =>
                navigate(`/interviews/${existingInterview.interviewId}`)
              }
            />
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
