// TypeScript interfaces for the HireTrack Interview Management module.

export type InterviewRound = 'technical' | 'hr';
export type InterviewMode = 'video' | 'phone' | 'in_person';
export type InterviewStatus =
  | 'scheduled'
  | 'rescheduled'
  | 'completed'
  | 'cancelled';
export type InterviewResult = 'pending' | 'passed' | 'failed' | 'on_hold';

/**
 * Full interview record returned by the Loco.rs backend API.
 */
export interface InterviewRecord {
  interviewId: number;
  applicationId: number;
  jobId: number;
  jobTitle: string;
  department: string;
  companyName: string;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  recruiterId: number;
  interviewerName: string;
  interviewerEmail: string | null;
  interviewRound: InterviewRound;
  interviewDate: string;
  durationMinutes: number;
  interviewMode: InterviewMode;
  meetingLink: string | null;
  interviewStatus: InterviewStatus;
  interviewerNotes: string | null;
  interviewFeedback: string | null;
  interviewRating: number | null;
  interviewResult: InterviewResult;
  feedbackSubmittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request body sent to POST /api/interviews to schedule a new interview.
 */
export interface ScheduleInterviewPayload {
  applicationId: number;
  interviewerName: string;
  interviewerEmail: string | null;
  interviewRound: InterviewRound;
  interviewDate: string;
  durationMinutes: number;
  interviewMode: InterviewMode;
  meetingLink: string | null;
  interviewerNotes: string | null;
}

/**
 * Request body sent to PUT /api/interviews/:id to update or reschedule an interview.
 */
export interface UpdateInterviewPayload {
  interviewerName: string;
  interviewerEmail: string | null;
  interviewRound: InterviewRound;
  interviewDate: string;
  durationMinutes: number;
  interviewMode: InterviewMode;
  meetingLink: string | null;
  interviewStatus: InterviewStatus;
  interviewerNotes: string | null;
}

/**
 * Request body sent to PATCH /api/interviews/:id/feedback to record interviewer feedback and result.
 */
export interface RecordInterviewFeedbackPayload {
  interviewFeedback: string;
  interviewRating: number | null;
  interviewResult: InterviewResult;
  interviewStatus?: InterviewStatus;
}

export interface InterviewListFilters {
  scope?: 'upcoming' | 'results' | 'all';
  interviewRound?: InterviewRound | '';
  interviewStatus?: InterviewStatus | '';
  interviewResult?: InterviewResult | '';
  applicationId?: number;
}

export interface SingleInterviewResponse {
  message: string;
  interview: InterviewRecord;
}

export interface InterviewListResponse {
  interviews: InterviewRecord[];
  totalCount: number;
}
