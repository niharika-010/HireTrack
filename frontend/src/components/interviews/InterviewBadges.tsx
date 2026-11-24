import type {
  InterviewResult,
  InterviewRound,
  InterviewStatus,
} from '../../types/interview';
import {
  formatInterviewResultLabel,
  formatInterviewRoundLabel,
  formatInterviewStatusLabel,
} from '../../utils/interviewHelpers';

export function InterviewRoundBadge({
  interviewRound,
}: {
  interviewRound: InterviewRound;
}) {
  const colorClasses =
    interviewRound === 'technical'
      ? 'bg-indigo-50 text-indigo-700 ring-indigo-200'
      : 'bg-teal-50 text-teal-700 ring-teal-200';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${colorClasses}`}
    >
      {formatInterviewRoundLabel(interviewRound)}
    </span>
  );
}

export function InterviewStatusBadge({
  interviewStatus,
}: {
  interviewStatus: InterviewStatus;
}) {
  const colorMap: Record<InterviewStatus, string> = {
    scheduled: 'bg-sky-50 text-sky-700 ring-sky-200',
    rescheduled: 'bg-amber-50 text-amber-800 ring-amber-200',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${colorMap[interviewStatus]}`}
    >
      {formatInterviewStatusLabel(interviewStatus)}
    </span>
  );
}

export function InterviewResultBadge({
  interviewResult,
}: {
  interviewResult: InterviewResult;
}) {
  const colorMap: Record<InterviewResult, string> = {
    pending: 'bg-slate-100 text-slate-700 ring-slate-200',
    passed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    failed: 'bg-rose-50 text-rose-700 ring-rose-200',
    on_hold: 'bg-amber-50 text-amber-800 ring-amber-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${colorMap[interviewResult]}`}
    >
      {formatInterviewResultLabel(interviewResult)}
    </span>
  );
}
