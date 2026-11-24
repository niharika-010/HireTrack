// TypeScript interfaces for candidate profiles and uploaded resume metadata.

export interface CandidateProfile {
  candidateId: number;
  userId: number;
  fullName: string;
  userEmail: string;
  phoneNumber: string | null;
  currentLocation: string | null;
  yearsOfExperience: number;
  skillsSummary: string | null;
  resumeUrl: string | null;
  resumeFileName: string | null;
  resumeMimeType: string | null;
  resumeFileSizeBytes: number | null;
  resumeUploadedAt: string | null;
  updatedAt: string;
}

export interface UpdateCandidateProfilePayload {
  phoneNumber: string | null;
  currentLocation: string | null;
  yearsOfExperience: number;
  skillsSummary: string | null;
}

export interface CandidateProfileResponse {
  message: string;
  profile: CandidateProfile;
}
