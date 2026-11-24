import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { FormAlert } from '../components/forms/FormAlert';
import { FormSelect } from '../components/forms/FormSelect';
import type { SelectOptionItem } from '../components/forms/FormSelect';
import {
  InterviewRoundBadge,
  InterviewStatusBadge,
} from '../components/interviews/InterviewBadges';
import { LoadingState } from '../components/LoadingState';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { fetchInterviews } from '../services/interviewService';
import type { InterviewRecord, InterviewRound } from '../types/interview';
import { formatDateTime } from '../utils/applicationHelpers';
import {
  formatInterviewModeLabel,
  groupInterviewsByDate,
} from '../utils/interviewHelpers';

const ROUND_FILTER_OPTIONS: SelectOptionItem[] = [
  { value: '', label: 'All rounds (Technical & HR)' },
  { value: 'technical', label: 'Technical Round' },
  { value: 'hr', label: 'HR Round' },
];

type ViewMode = 'calendar' | 'list';

/**
 * Upcoming Interviews page featuring both Calendar (date-grouped) and List views.
 */
export function UpcomingInterviewsPage() {
  const { apiBaseUrl } = useAppConfig();
  const { authToken, currentUser } = useAuth();
  const isRecruiter = currentUser?.userRole === 'recruiter';

  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [roundFilter, setRoundFilter] = useState<InterviewRound | ''>('');
  const [upcomingInterviews, setUpcomingInterviews] = useState<
    InterviewRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    let isCancelled = false;

    fetchInterviews(apiBaseUrl, authToken, {
      scope: 'upcoming',
      interviewRound: roundFilter,
    })
      .then((response) => {
        if (!isCancelled) {
          setUpcomingInterviews(response.interviews);
          setPageError(null);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load upcoming interviews.';
          setPageError(message);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken, roundFilter]);

  const calendarGroups = groupInterviewsByDate(upcomingInterviews);

  return (
    <DashboardLayout pageTitle="Upcoming Interviews">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Interview Schedule
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              View upcoming Technical and HR interview sessions in Calendar or
              List mode.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Calendar vs List toggle */}
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`rounded-md px-3 py-1.5 transition ${
                  viewMode === 'calendar'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Calendar View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded-md px-3 py-1.5 transition ${
                  viewMode === 'list'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                List View
              </button>
            </div>

            {isRecruiter && (
              <Link
                to="/recruiter/interviews/new"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                + Schedule Interview
              </Link>
            )}
          </div>
        </div>

        {/* Round Filter */}
        <div className="w-full sm:w-64">
          <FormSelect
            selectId="upcoming-interviews-round-filter"
            label="Filter by round"
            value={roundFilter}
            options={ROUND_FILTER_OPTIONS}
            onValueChange={(value) => {
              setIsLoading(true);
              setRoundFilter(value as InterviewRound | '');
            }}
          />
        </div>

        {pageError && <FormAlert variant="error" message={pageError} />}

        {isLoading ? (
          <LoadingState message="Loading upcoming interviews..." />
        ) : upcomingInterviews.length === 0 ? (
          <EmptyState
            title="No upcoming interviews scheduled"
            description={
              isRecruiter
                ? 'Schedule a Technical or HR interview with any active candidate to see it appear on your schedule.'
                : 'When a recruiter schedules an interview for your application, the date, round, and meeting details will appear here.'
            }
            action={
              isRecruiter ? (
                <Link
                  to="/recruiter/interviews/new"
                  className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Schedule Interview
                </Link>
              ) : undefined
            }
          />
        ) : viewMode === 'calendar' ? (
          <div className="space-y-6">
            {calendarGroups.map((group) => (
              <section key={group.dateLabel} className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  {group.dateLabel}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {group.items.map((interview) => (
                    <article
                      key={interview.interviewId}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-300"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <InterviewRoundBadge
                            interviewRound={interview.interviewRound}
                          />
                          <InterviewStatusBadge
                            interviewStatus={interview.interviewStatus}
                          />
                        </div>

                        <h4 className="mt-3 text-base font-bold text-slate-900">
                          <Link
                            to={`/interviews/${interview.interviewId}`}
                            className="hover:text-indigo-600"
                          >
                            {interview.jobTitle}
                          </Link>
                        </h4>

                        <p className="mt-1 text-sm text-slate-600">
                          Candidate: <strong>{interview.candidateName}</strong>
                        </p>
                        <p className="text-xs text-slate-500">
                          Interviewer: {interview.interviewerName} &middot;{' '}
                          {formatInterviewModeLabel(interview.interviewMode)} (
                          {interview.durationMinutes} min)
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <time className="text-xs font-semibold text-indigo-700">
                          {formatDateTime(interview.interviewDate)}
                        </time>
                        <Link
                          to={`/interviews/${interview.interviewId}`}
                          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                        >
                          View Details
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Date &amp; Time</th>
                    <th className="px-5 py-3.5">Candidate &amp; Role</th>
                    <th className="px-5 py-3.5">Interviewer</th>
                    <th className="px-5 py-3.5">Round</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {upcomingInterviews.map((interview) => (
                    <tr
                      key={interview.interviewId}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4 text-xs font-semibold text-slate-900">
                        {formatDateTime(interview.interviewDate)}
                        <p className="font-normal text-slate-500">
                          {interview.durationMinutes} min &middot;{' '}
                          {formatInterviewModeLabel(interview.interviewMode)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {interview.candidateName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {interview.jobTitle}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {interview.interviewerName}
                      </td>
                      <td className="px-5 py-4">
                        <InterviewRoundBadge
                          interviewRound={interview.interviewRound}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <InterviewStatusBadge
                          interviewStatus={interview.interviewStatus}
                        />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/interviews/${interview.interviewId}`}
                          className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
