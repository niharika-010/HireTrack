// TypeScript interfaces for Phase 8 dashboard analytics returned by PostgreSQL-backed APIs.

import type { HireTrackApplicationStatus } from './application';
import type {
  InterviewMode,
  InterviewRound,
  InterviewStatus,
} from './interview';

export interface StatusCountItem {
  status: HireTrackApplicationStatus;
  label: string;
  count: number;
}

export interface CategoryCountItem {
  label: string;
  count: number;
}

export interface DashboardUpcomingInterview {
  interviewId: number;
  applicationId: number;
  jobTitle: string;
  candidateName: string;
  interviewerName: string;
  interviewRound: InterviewRound;
  interviewDate: string;
  interviewMode: InterviewMode;
  interviewStatus: InterviewStatus;
}

export interface AdminDashboardStats {
  activeJobsCount: number;
  totalJobsCount: number;
  totalCandidatesCount: number;
  totalRecruitersCount: number;
  totalApplicationsCount: number;
  upcomingInterviewsCount: number;
  unreadNotificationsCount: number;
  applicationCountsByStatus: StatusCountItem[];
  jobsByDepartment: CategoryCountItem[];
  upcomingInterviews: DashboardUpcomingInterview[];
}

export interface RecruiterDashboardStats {
  activeJobsCount: number;
  totalJobsCount: number;
  totalCandidatesCount: number;
  totalApplicationsCount: number;
  upcomingInterviewsCount: number;
  unreadNotificationsCount: number;
  applicationCountsByStatus: StatusCountItem[];
  applicationsByJob: CategoryCountItem[];
  upcomingInterviews: DashboardUpcomingInterview[];
}

export interface CandidateDashboardStats {
  activeJobsCount: number;
  totalApplicationsCount: number;
  shortlistedOrAdvancedCount: number;
  upcomingInterviewsCount: number;
  unreadNotificationsCount: number;
  applicationCountsByStatus: StatusCountItem[];
  upcomingInterviews: DashboardUpcomingInterview[];
}
