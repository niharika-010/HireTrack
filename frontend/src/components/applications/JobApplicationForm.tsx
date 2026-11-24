import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { FormAlert } from '../forms/FormAlert';
import { FormButton } from '../forms/FormButton';
import { FormTextarea } from '../forms/FormTextarea';
import type { CandidateProfile } from '../../types/candidate';

export interface JobApplicationFormProps {
  jobTitle: string;
  candidateProfile: CandidateProfile | null;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmitApplication: (coverLetter: string | null) => Promise<void>;
}

/**
 * Candidate job application form embedded on open Job Details pages.
 * Automatically snapshots the candidate's uploaded resume URL when submitted.
 */
export function JobApplicationForm({
  jobTitle,
  candidateProfile,
  isSubmitting,
  submitError,
  onSubmitApplication,
}: JobApplicationFormProps) {
  const [coverLetter, setCoverLetter] = useState<string>('');

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedCoverLetter = coverLetter.trim();
    await onSubmitApplication(
      cleanedCoverLetter.length > 0 ? cleanedCoverLetter : null
    );
  }

  return (
    <form
      onSubmit={(event) => void handleFormSubmit(event)}
      className="space-y-4 rounded-xl border border-indigo-200 bg-white p-6 shadow-xs"
    >
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          Apply for {jobTitle}
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Submit your application directly to the hiring recruiter. Duplicate
          applications to the same job are automatically prevented.
        </p>
      </div>

      {/* Show attached resume status with a quick shortcut to upload one */}
      {candidateProfile?.resumeUrl ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Attached resume:{' '}
          <strong>
            {candidateProfile.resumeFileName ?? 'Uploaded Resume'}
          </strong>{' '}
          (will be snapshotted with this application).
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You haven&apos;t uploaded a resume yet. You can still apply now, or{' '}
          <Link
            to="/candidate/profile"
            className="font-semibold underline hover:text-amber-700"
          >
            upload a PDF/DOCX resume first
          </Link>
          .
        </div>
      )}

      {submitError && <FormAlert variant="error" message={submitError} />}

      <FormTextarea
        textareaId="application-cover-letter"
        label="Cover Letter / Introduction (optional)"
        rows={4}
        value={coverLetter}
        onValueChange={setCoverLetter}
        placeholder="Share why you're excited about this role and highlight relevant experience..."
        isDisabled={isSubmitting}
      />

      <div className="flex justify-end">
        <FormButton
          buttonType="submit"
          isLoading={isSubmitting}
          loadingLabel="Submitting application..."
        >
          Submit Application
        </FormButton>
      </div>
    </form>
  );
}
