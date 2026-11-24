// TypeScript interfaces for the HireTrack Job Management module.

export type EmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'internship';

export type JobStatus = 'open' | 'paused' | 'closed';

/**
 * Job opening record returned by the Loco.rs backend API.
 */
export interface JobOpening {
  jobId: number;
  recruiterId: number;
  companyName: string;
  jobTitle: string;
  department: string;
  jobLocation: string;
  employmentType: EmploymentType;
  salaryMin: number | null;
  salaryMax: number | null;
  jobDescription: string;
  requirements: string | null;
  jobStatus: JobStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request payload sent to POST /api/jobs to create a new opening.
 */
export interface CreateJobPayload {
  jobTitle: string;
  department: string;
  jobLocation: string;
  employmentType: EmploymentType;
  salaryMin: number | null;
  salaryMax: number | null;
  jobDescription: string;
  requirements: string | null;
  jobStatus?: JobStatus;
}

/**
 * Request payload sent to PUT /api/jobs/:id to update an existing opening.
 */
export interface UpdateJobPayload {
  jobTitle: string;
  department: string;
  jobLocation: string;
  employmentType: EmploymentType;
  salaryMin: number | null;
  salaryMax: number | null;
  jobDescription: string;
  requirements: string | null;
  jobStatus: JobStatus;
}

/**
 * Optional search and filter criteria sent as query parameters to GET /api/jobs.
 */
export interface JobFilterParams {
  search?: string;
  department?: string;
  jobLocation?: string;
  employmentType?: EmploymentType | '';
  jobStatus?: JobStatus | '';
  mine?: boolean;
}

/**
 * Response body returned by GET /api/jobs.
 */
export interface JobListResponse {
  jobs: JobOpening[];
  totalCount: number;
}

/**
 * Response body returned by POST /api/jobs, GET /api/jobs/:id, PUT /api/jobs/:id, and PATCH /api/jobs/:id/close.
 */
export interface SingleJobResponse {
  message: string;
  job: JobOpening;
}
