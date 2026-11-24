import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { FormAlert } from '../forms/FormAlert';
import { FormButton } from '../forms/FormButton';
import type { CandidateProfile } from '../../types/candidate';
import { formatDateTime, formatFileSize } from '../../utils/applicationHelpers';

const MAX_CLIENT_FILE_BYTES = 5 * 1024 * 1024;

export interface ResumeUploadFormProps {
  candidateProfile: CandidateProfile;
  isUploading: boolean;
  uploadError: string | null;
  uploadSuccess: string | null;
  onUploadResume: (resumeFile: File) => Promise<void>;
  onOpenResume: (resumeUrl: string) => Promise<void>;
}

/**
 * Dedicated resume upload component supporting PDF and DOCX files up to 5 MB.
 * Performs client-side pre-checks while the backend enforces full MIME, magic-byte, and size validation.
 */
export function ResumeUploadForm({
  candidateProfile,
  isUploading,
  uploadError,
  uploadSuccess,
  onUploadResume,
  onOpenResume,
}: ResumeUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientValidationError, setClientValidationError] = useState<
    string | null
  >(null);

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    setClientValidationError(null);
    const pickedFile = event.target.files?.[0] ?? null;

    if (!pickedFile) {
      setSelectedFile(null);
      return;
    }

    const lowerName = pickedFile.name.toLowerCase();
    if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.docx')) {
      setSelectedFile(null);
      setClientValidationError(
        'Unsupported file type. Please choose a PDF (.pdf) or Word (.docx) resume.'
      );
      return;
    }

    if (pickedFile.size > MAX_CLIENT_FILE_BYTES) {
      setSelectedFile(null);
      setClientValidationError('File is too large. Maximum size is 5 MB.');
      return;
    }

    setSelectedFile(pickedFile);
  }

  async function handleUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientValidationError(null);

    if (!selectedFile) {
      setClientValidationError('Please select a PDF or DOCX file to upload.');
      return;
    }

    await onUploadResume(selectedFile);
    setSelectedFile(null);
  }

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Resume Upload</h3>
        <p className="mt-1 text-sm text-slate-600">
          Upload your latest resume (PDF or DOCX, max 5 MB). Your current resume
          is automatically attached whenever you apply for a job.
        </p>
      </div>

      {candidateProfile.resumeUrl && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              {candidateProfile.resumeFileName ?? 'Uploaded Resume'}
            </p>
            <p className="text-xs text-emerald-700">
              {formatFileSize(candidateProfile.resumeFileSizeBytes)}
              {candidateProfile.resumeUploadedAt
                ? ` · Uploaded ${formatDateTime(candidateProfile.resumeUploadedAt)}`
                : ''}
            </p>
          </div>
          <FormButton
            variant="secondary"
            onClick={() => void onOpenResume(candidateProfile.resumeUrl as string)}
          >
            View Resume
          </FormButton>
        </div>
      )}

      {clientValidationError && (
        <FormAlert variant="error" message={clientValidationError} />
      )}
      {uploadError && <FormAlert variant="error" message={uploadError} />}
      {uploadSuccess && <FormAlert variant="success" message={uploadSuccess} />}

      <form
        onSubmit={(event) => void handleUploadSubmit(event)}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="resume-file-input"
            className="block text-sm font-medium text-slate-700"
          >
            Choose Resume File (.pdf or .docx)
          </label>
          <input
            id="resume-file-input"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileSelection}
            disabled={isUploading}
            className="mt-1.5 block w-full cursor-pointer rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-700"
          />
          {selectedFile && (
            <p className="mt-1.5 text-xs text-slate-600">
              Ready to upload: <strong>{selectedFile.name}</strong> (
              {formatFileSize(selectedFile.size)})
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <FormButton
            buttonType="submit"
            isLoading={isUploading}
            loadingLabel="Uploading resume..."
            isDisabled={!selectedFile}
          >
            {candidateProfile.resumeUrl ? 'Replace Resume' : 'Upload Resume'}
          </FormButton>
        </div>
      </form>
    </section>
  );
}
