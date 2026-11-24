import { Link } from 'react-router-dom';
import { EmptyState } from '../EmptyState';
import {
  InterviewRoundBadge,
  InterviewStatusBadge,
} from '../interviews/InterviewBadges';
import type { DashboardUpcomingInterview } from '../../types/dashboard';
import { formatDateTime } from '../../utils/applicationHelpers';
import { formatInterviewModeLabel } from '../../utils/interviewHelpers';

export interface UpcomingInterviewsCardProps {
  interviews: DashboardUpcomingInterview[];
  emptyDescription: string;
}

/**
 * Reusable dashboard card displaying the next upcoming interviews retrieved from PostgreSQL.
 */
export function UpcomingInterviewsCard({
  interviews,
  emptyDescription,
}: UpcomingInterviewsCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Upcoming Interviews
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Next scheduled Technical and HR interview sessions
          </p>
        </div>

        <Link
          to="/interviews/upcoming"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          View all &rarr;
        </Link>
      </div>

      {interviews.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No upcoming interviews"
            description={emptyDescription}
          />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {interviews.map((interview) => (
            <li
              key={interview.interviewId}
              className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-1 last:pb-0"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <InterviewRoundBadge
                    interviewRound={interview.interviewRound}
                  />
                  <InterviewStatusBadge
                    interviewStatus={interview.interviewStatus}
                  />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  <Link
                    to={`/interviews/${interview.interviewId}`}
                    className="hover:text-indigo-600"
                  >
                    {interview.jobTitle}
                  </Link>
                </p>
                <p className="text-xs text-slate-500">
                  Candidate: {interview.candidateName} &middot; Interviewer:{' '}
                  {interview.interviewerName} &middot;{' '}
                  {formatInterviewModeLabel(interview.interviewMode)}
                </p>
              </div>

              <div className="text-right">
                <time className="block text-xs font-semibold text-indigo-700">
                  {formatDateTime(interview.interviewDate)}
                </time>
                <Link
                  to={`/interviews/${interview.interviewId}`}
                  className="mt-1 inline-block text-xs font-medium text-slate-600 hover:text-indigo-600"
                >
                  Open details
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
