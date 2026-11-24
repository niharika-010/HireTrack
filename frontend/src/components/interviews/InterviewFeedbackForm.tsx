import { useState } from 'react';
import type { FormEvent } from 'react';
import { FormAlert } from '../forms/FormAlert';
import { FormButton } from '../forms/FormButton';
import { FormSelect } from '../forms/FormSelect';
import type { SelectOptionItem } from '../forms/FormSelect';
import { FormTextarea } from '../forms/FormTextarea';
import type {
  InterviewRecord,
  InterviewResult,
  RecordInterviewFeedbackPayload,
} from '../../types/interview';

export interface InterviewFeedbackFormProps {
  interview: InterviewRecord;
  isSubmitting: boolean;
  serverError: string | null;
  successMessage: string | null;
  onSubmitFeedback: (payload: RecordInterviewFeedbackPayload) => Promise<void>;
}

const RESULT_OPTIONS: SelectOptionItem[] = [
  { value: 'passed', label: 'Passed — Advance Candidate' },
  { value: 'on_hold', label: 'On Hold — Needs Further Discussion' },
  { value: 'failed', label: 'Failed — Do Not Advance' },
  { value: 'pending', label: 'Pending — Evaluation In Progress' },
];

const RATING_OPTIONS: SelectOptionItem[] = [
  { value: '', label: 'No numeric rating' },
  { value: '5', label: '5 / 5 — Exceptional' },
  { value: '4', label: '4 / 5 — Strong' },
  { value: '3', label: '3 / 5 — Meets Expectations' },
  { value: '2', label: '2 / 5 — Below Expectations' },
  { value: '1', label: '1 / 5 — Not a Fit' },
];

/**
 * Reusable form allowing the owning recruiter to record structured interview feedback,
 * rating, and evaluation result via PATCH /api/interviews/:id/feedback.
 */
export function InterviewFeedbackForm({
  interview,
  isSubmitting,
  serverError,
  successMessage,
  onSubmitFeedback,
}: InterviewFeedbackFormProps) {
  const [interviewFeedback, setInterviewFeedback] = useState<string>(
    interview.interviewFeedback ?? ''
  );
  const [interviewRating, setInterviewRating] = useState<string>(
    interview.interviewRating !== null ? String(interview.interviewRating) : ''
  );
  const [interviewResult, setInterviewResult] = useState<InterviewResult>(
    interview.interviewResult === 'pending' ? 'passed' : interview.interviewResult
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleFeedbackSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    if (interviewFeedback.trim().length < 5) {
      setValidationError(
        'Please enter at least 5 characters of interview feedback.'
      );
      return;
    }

    await onSubmitFeedback({
      interviewFeedback: interviewFeedback.trim(),
      interviewRating: interviewRating ? Number(interviewRating) : null,
      interviewResult,
    });
  }

  return (
    <form
      onSubmit={(event) => void handleFeedbackSubmit(event)}
      noValidate
      className="space-y-4 rounded-xl border border-indigo-200 bg-white p-6 shadow-xs"
    >
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          Record Interview Feedback &amp; Result
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Submitting a final outcome (Passed, Failed, or On Hold) automatically
          marks this interview as completed and publishes it to Interview Results.
        </p>
      </div>

      {validationError && <FormAlert variant="error" message={validationError} />}
      {serverError && <FormAlert variant="error" message={serverError} />}
      {successMessage && (
        <FormAlert variant="success" message={successMessage} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          selectId="feedback-interview-result"
          label="Interview Result"
          value={interviewResult}
          options={RESULT_OPTIONS}
          onValueChange={(value) => setInterviewResult(value as InterviewResult)}
          isRequired
          isDisabled={isSubmitting}
        />

        <FormSelect
          selectId="feedback-interview-rating"
          label="Overall Rating (optional)"
          value={interviewRating}
          options={RATING_OPTIONS}
          onValueChange={setInterviewRating}
          isDisabled={isSubmitting}
        />
      </div>

      <FormTextarea
        textareaId="feedback-interview-notes"
        label="Interview Feedback"
        rows={4}
        value={interviewFeedback}
        onValueChange={setInterviewFeedback}
        placeholder="Summarize candidate strengths, problem-solving approach, communication, and hiring recommendation..."
        isRequired
        isDisabled={isSubmitting}
      />

      <div className="flex justify-end">
        <FormButton
          buttonType="submit"
          isLoading={isSubmitting}
          loadingLabel="Saving feedback..."
        >
          Save Interview Feedback
        </FormButton>
      </div>
    </form>
  );
}
