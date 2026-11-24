import { useEffect, useState } from 'react';
import { CandidateProfileForm } from '../components/candidates/CandidateProfileForm';
import { ResumeUploadForm } from '../components/candidates/ResumeUploadForm';
import { FormAlert } from '../components/forms/FormAlert';
import { LoadingState } from '../components/LoadingState';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import {
  fetchCandidateProfile,
  openAuthenticatedResume,
  updateCandidateProfile,
  uploadCandidateResume,
} from '../services/candidateService';
import type {
  CandidateProfile,
  UpdateCandidateProfilePayload,
} from '../types/candidate';

/**
 * Candidate profile & resume management page backed by GET/PUT /api/candidates/me
 * and POST /api/candidates/me/resume.
 */
export function CandidateProfilePage() {
  const { apiBaseUrl } = useAppConfig();
  const { authToken } = useAuth();

  const [candidateProfile, setCandidateProfile] =
    useState<CandidateProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [isUploadingResume, setIsUploadingResume] = useState<boolean>(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeSuccess, setResumeSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    let isCancelled = false;

    fetchCandidateProfile(apiBaseUrl, authToken)
      .then((response) => {
        if (!isCancelled) {
          setCandidateProfile(response.profile);
          setLoadError(null);
          setIsLoadingProfile(false);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load candidate profile.';
          setLoadError(message);
          setIsLoadingProfile(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken]);

  async function handleSaveProfile(payload: UpdateCandidateProfilePayload) {
    if (!authToken) {
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const response = await updateCandidateProfile(
        apiBaseUrl,
        authToken,
        payload
      );
      setCandidateProfile(response.profile);
      setProfileSuccess(response.message);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to save candidate profile.';
      setProfileError(message);
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleUploadResume(resumeFile: File) {
    if (!authToken) {
      return;
    }

    setIsUploadingResume(true);
    setResumeError(null);
    setResumeSuccess(null);

    try {
      const response = await uploadCandidateResume(
        apiBaseUrl,
        authToken,
        resumeFile
      );
      setCandidateProfile(response.profile);
      setResumeSuccess(response.message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to upload resume.';
      setResumeError(message);
    } finally {
      setIsUploadingResume(false);
    }
  }

  async function handleOpenResume(resumeUrl: string) {
    if (!authToken) {
      return;
    }

    setResumeError(null);

    try {
      await openAuthenticatedResume(resumeUrl, authToken);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to open resume file.';
      setResumeError(message);
    }
  }

  return (
    <DashboardLayout pageTitle="Candidate Profile & Resume">
      <div className="mx-auto max-w-4xl space-y-6">
        {loadError && <FormAlert variant="error" message={loadError} />}

        {isLoadingProfile ? (
          <LoadingState message="Loading your candidate profile..." />
        ) : candidateProfile ? (
          <>
            <CandidateProfileForm
              initialProfile={candidateProfile}
              isSaving={isSavingProfile}
              serverError={profileError}
              successMessage={profileSuccess}
              onSaveProfile={handleSaveProfile}
            />

            <ResumeUploadForm
              candidateProfile={candidateProfile}
              isUploading={isUploadingResume}
              uploadError={resumeError}
              uploadSuccess={resumeSuccess}
              onUploadResume={handleUploadResume}
              onOpenResume={handleOpenResume}
            />
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
