import type {
  InterviewMode,
  InterviewRecord,
  InterviewResult,
  InterviewRound,
  InterviewStatus,
} from '../types/interview';

export function formatInterviewRoundLabel(
  interviewRound: InterviewRound
): string {
  return interviewRound === 'hr' ? 'HR Round' : 'Technical Round';
}

export function formatInterviewModeLabel(interviewMode: InterviewMode): string {
  if (interviewMode === 'video') {
    return 'Video Call';
  }
  if (interviewMode === 'phone') {
    return 'Phone Screen';
  }
  return 'In-Person';
}

export function formatInterviewStatusLabel(
  interviewStatus: InterviewStatus
): string {
  const labels: Record<InterviewStatus, string> = {
    scheduled: 'Scheduled',
    rescheduled: 'Rescheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[interviewStatus];
}

export function formatInterviewResultLabel(
  interviewResult: InterviewResult
): string {
  const labels: Record<InterviewResult, string> = {
    pending: 'Pending',
    passed: 'Passed',
    failed: 'Failed',
    on_hold: 'On Hold',
  };
  return labels[interviewResult];
}

/**
 * Converts an ISO-8601 timestamp into the local `YYYY-MM-DDTHH:mm` format used by `<input type="datetime-local">`.
 */
export function toDateTimeLocalValue(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const pad = (value: number) => String(value).padStart(2, '0');
  const year = parsed.getFullYear();
  const month = pad(parsed.getMonth() + 1);
  const day = pad(parsed.getDate());
  const hours = pad(parsed.getHours());
  const minutes = pad(parsed.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Groups interviews by calendar day string (e.g. "Tue, Nov 25, 2026") for the Calendar schedule view.
 */
export function groupInterviewsByDate(
  interviews: InterviewRecord[]
): Array<{ dateLabel: string; items: InterviewRecord[] }> {
  const groups = new Map<string, InterviewRecord[]>();

  for (const interview of interviews) {
    const parsedDate = new Date(interview.interviewDate);
    const dateLabel = Number.isNaN(parsedDate.getTime())
      ? 'Unscheduled Date'
      : parsedDate.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });

    const existing = groups.get(dateLabel) ?? [];
    existing.push(interview);
    groups.set(dateLabel, existing);
  }

  return Array.from(groups.entries()).map(([dateLabel, items]) => ({
    dateLabel,
    items,
  }));
}
