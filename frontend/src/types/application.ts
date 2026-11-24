// TypeScript interfaces for Phase 6 job applications and status history.

import type { EmploymentType } from './job';

/**
 * The 6 official HireTrack application lifecycle statuses.
 */
export type HireTrackApplicationStatus =
  | 'applied'
  | 'under_review'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'selected'
  | 'rejected';

export interface SubmitApplicationPayload {
  jobId: number;
  coverLetter: string | null;
}

export interface UpdateApplicationStatusPayload {
  applicationStatus: HireTrackApplicationStatus;
  statusNote: string | null;
}

export interface ApplicationListFilters {
  jobId?: number;
  applicationStatus?: HireTrackApplicationStatus | '';
}

export interface ApplicationHistoryEntry {
  historyId: number;
  previousStatus: HireTrackApplicationStatus | null;
  newStatus: HireTrackApplicationStatus;
  changedByName: string;
  changedByRole: string;
  statusNote: string | null;
  changedAt: string;
}

export interface ApplicationSummary {
  applicationId: number;
  jobId: number;
  jobTitle: string;
  department: string;
  jobLocation: string;
  employmentType: EmploymentType;
  companyName: string;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  candidateLocation: string | null;
  yearsOfExperience: number;
  skillsSummary: string | null;
  applicationStatus: HireTrackApplicationStatus;
  coverLetter: string | null;
  resumeSnapshotUrl: string | null;
  resumeFileName: string | null;
  appliedAt: string;
  updatedAt: string;
}

export interface ApplicationDetail extends ApplicationSummary {
  history: ApplicationHistoryEntry[];
}

export interface ApplicationDetailResponse {
  message: string;
  application: ApplicationDetail;
}

export interface ApplicationListResponse {
  applications: ApplicationSummary[];
  totalCount: number;
}
