import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { FormAlert } from '../components/forms/FormAlert';
import { FormSelect } from '../components/forms/FormSelect';
import type { SelectOptionItem } from '../components/forms/FormSelect';
import {
  InterviewResultBadge,
  InterviewRoundBadge,
  InterviewStatusBadge,
} from '../components/interviews/InterviewBadges';
import { LoadingState } from '../components/LoadingState';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { fetchInterviews } from '../services/interviewService';
import type {
  InterviewRecord,
  InterviewResult,
  InterviewRound,
} from '../types/interview';
import { formatDateTime } from '../utils/applicationHelpers';

const ROUND_OPTIONS: SelectOptionItem[] = [
  { value: '', label: 'All rounds' },
  { value: 'technical', label: 'Technical Round' },
  { value: 'hr', label: 'HR Round' },
];

const RESULT_OPTIONS: SelectOptionItem[] = [
  { value: '', label: 'All results' },
  { value: 'passed', label: 'Passed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
];

/**
 * Interview Results page displaying completed interviews, ratings, outcomes, and feedback notes.
 */
export function InterviewResultsPage() {
  const { apiBaseUrl } = useAppConfig();
  const { authToken } = useAuth();

  const [roundFilter, setRoundFilter] = useState<InterviewRound | ''>('');
  const [resultFilter, setResultFilter] = useState<InterviewResult | ''>('');
  const [interviewResults, setInterviewResults] = useState<InterviewRecord[]>(
    []
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    let isCancelled = false;

    fetchInterviews(apiBaseUrl, authToken, {
      scope: 'results',
      interviewRound: roundFilter,
      interviewResult: resultFilter,
    })
      .then((response) => {
        if (!isCancelled) {
          setInterviewResults(response.interviews);
          setPageError(null);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load interview results.';
          setPageError(message);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken, roundFilter, resultFilter]);

  return (
    <DashboardLayout pageTitle="Interview Results">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Evaluated Interviews &amp; Feedback
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Review Technical and HR interview outcomes, scores, and interviewer
            feedback.
          </p>
        </div>

        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:grid-cols-2">
          <FormSelect
            selectId="results-round-filter"
            label="Filter by Interview Round"
            value={roundFilter}
            options={ROUND_OPTIONS}
            onValueChange={(value) => {
              setIsLoading(true);
              setRoundFilter(value as InterviewRound | '');
            }}
          />

          <FormSelect
            selectId="results-outcome-filter"
            label="Filter by Result"
            value={resultFilter}
            options={RESULT_OPTIONS}
            onValueChange={(value) => {
              setIsLoading(true);
              setResultFilter(value as InterviewResult | '');
            }}
          />
        </div>

        {pageError && <FormAlert variant="error" message={pageError} />}

        {isLoading ? (
          <LoadingState message="Loading interview results..." />
        ) : interviewResults.length === 0 ? (
          <EmptyState
            title="No interview results recorded yet"
            description="Once recruiters submit feedback and outcomes on completed interviews, the results will appear here."
            action={
              <Link
                to="/interviews/upcoming"
                className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                View Upcoming Interviews
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4">
            {interviewResults.map((interview) => (
              <article
                key={interview.interviewId}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <InterviewRoundBadge
                        interviewRound={interview.interviewRound}
                      />
                      <InterviewResultBadge
                        interviewResult={interview.interviewResult}
                      />
                      <InterviewStatusBadge
                        interviewStatus={interview.interviewStatus}
                      />
                      {interview.interviewRating !== null && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">
                          {interview.interviewRating} / 5
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2.5 text-lg font-bold text-slate-900">
                      <Link
                        to={`/interviews/${interview.interviewId}`}
                        className="hover:text-indigo-600"
                      >
                        {interview.candidateName} — {interview.jobTitle}
                      </Link>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Interviewer: {interview.interviewerName} &middot;{' '}
                      {formatDateTime(interview.interviewDate)}
                    </p>
                  </div>

                  <Link
                    to={`/interviews/${interview.interviewId}`}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    Open Full Details
                  </Link>
                </div>

                {interview.interviewFeedback && (
                  <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {interview.interviewFeedback}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
