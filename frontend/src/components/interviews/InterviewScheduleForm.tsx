import { useState } from 'react';
import type { FormEvent } from 'react';
import { FormAlert } from '../forms/FormAlert';
import { FormButton } from '../forms/FormButton';
import { FormInput } from '../forms/FormInput';
import { FormSelect } from '../forms/FormSelect';
import type { SelectOptionItem } from '../forms/FormSelect';
import { FormTextarea } from '../forms/FormTextarea';
import type { ApplicationSummary } from '../../types/application';
import type {
  InterviewMode,
  InterviewRound,
  InterviewStatus,
} from '../../types/interview';
import { toDateTimeLocalValue } from '../../utils/interviewHelpers';

export interface InterviewScheduleFormValues {
  applicationId: number;
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

export interface InterviewScheduleFormProps {
  mode: 'create' | 'edit';
  availableApplications?: ApplicationSummary[];
  initialValues?: Partial<InterviewScheduleFormValues>;
  isSubmitting: boolean;
  serverError: string | null;
  onSubmitSchedule: (values: InterviewScheduleFormValues) => Promise<void>;
  onCancel?: () => void;
}

const ROUND_OPTIONS: SelectOptionItem[] = [
  { value: 'technical', label: 'Technical Round' },
  { value: 'hr', label: 'HR Round' },
];

const MODE_OPTIONS: SelectOptionItem[] = [
  { value: 'video', label: 'Video Call' },
  { value: 'phone', label: 'Phone Screen' },
  { value: 'in_person', label: 'In-Person' },
];

const STATUS_OPTIONS: SelectOptionItem[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

/**
 * Reusable form for scheduling a new Technical/HR interview or rescheduling an existing interview.
 */
export function InterviewScheduleForm({
  mode,
  availableApplications = [],
  initialValues,
  isSubmitting,
  serverError,
  onSubmitSchedule,
  onCancel,
}: InterviewScheduleFormProps) {
  const defaultAppId =
    initialValues?.applicationId ??
    (availableApplications.length > 0 ? availableApplications[0].applicationId : 0);

  const [selectedApplicationId, setSelectedApplicationId] = useState<string>(
    defaultAppId > 0 ? String(defaultAppId) : ''
  );
  const [interviewerName, setInterviewerName] = useState<string>(
    initialValues?.interviewerName ?? ''
  );
  const [interviewerEmail, setInterviewerEmail] = useState<string>(
    initialValues?.interviewerEmail ?? ''
  );
  const [interviewRound, setInterviewRound] = useState<InterviewRound>(
    initialValues?.interviewRound ?? 'technical'
  );
  const [interviewDate, setInterviewDate] = useState<string>(
    initialValues?.interviewDate
      ? toDateTimeLocalValue(initialValues.interviewDate)
      : ''
  );
  const [durationInput, setDurationInput] = useState<string>(
    String(initialValues?.durationMinutes ?? 45)
  );
  const [interviewMode, setInterviewMode] = useState<InterviewMode>(
    initialValues?.interviewMode ?? 'video'
  );
  const [meetingLink, setMeetingLink] = useState<string>(
    initialValues?.meetingLink ?? ''
  );
  const [interviewStatus, setInterviewStatus] = useState<InterviewStatus>(
    initialValues?.interviewStatus ?? 'scheduled'
  );
  const [interviewerNotes, setInterviewerNotes] = useState<string>(
    initialValues?.interviewerNotes ?? ''
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const applicationSelectOptions: SelectOptionItem[] = availableApplications.map(
    (application) => ({
      value: String(application.applicationId),
      label: `${application.candidateName} — ${application.jobTitle}`,
    })
  );

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    const parsedApplicationId = Number(selectedApplicationId);
    if (mode === 'create' && (!Number.isInteger(parsedApplicationId) || parsedApplicationId <= 0)) {
      setValidationError('Please select a candidate application.');
      return;
    }

    if (interviewerName.trim().length < 2) {
      setValidationError('Interviewer name must be at least 2 characters long.');
      return;
    }

    if (!interviewDate) {
      setValidationError('Please choose an interview date and time.');
      return;
    }

    const parsedDate = new Date(interviewDate);
    if (Number.isNaN(parsedDate.getTime())) {
      setValidationError('Please enter a valid interview date and time.');
      return;
    }

    const requiresFutureDate =
      mode === 'create' ||
      interviewStatus === 'scheduled' ||
      interviewStatus === 'rescheduled';
    if (requiresFutureDate && parsedDate.getTime() <= Date.now()) {
      setValidationError('Interview date and time must be in the future.');
      return;
    }

    const parsedDuration = Number(durationInput.trim());
    if (!Number.isInteger(parsedDuration) || parsedDuration < 15 || parsedDuration > 240) {
      setValidationError('Duration must be between 15 and 240 minutes.');
      return;
    }

    const cleanEmail = interviewerEmail.trim();
    const cleanMeetingLink = meetingLink.trim();
    const cleanNotes = interviewerNotes.trim();

    await onSubmitSchedule({
      applicationId: parsedApplicationId,
      interviewerName: interviewerName.trim(),
      interviewerEmail: cleanEmail.length > 0 ? cleanEmail : null,
      interviewRound,
      interviewDate: parsedDate.toISOString(),
      durationMinutes: parsedDuration,
      interviewMode,
      meetingLink: cleanMeetingLink.length > 0 ? cleanMeetingLink : null,
      interviewStatus,
      interviewerNotes: cleanNotes.length > 0 ? cleanNotes : null,
    });
  }

  return (
    <form
      onSubmit={(event) => void handleFormSubmit(event)}
      noValidate
      className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
    >
      {validationError && <FormAlert variant="error" message={validationError} />}
      {serverError && <FormAlert variant="error" message={serverError} />}

      {mode === 'create' && (
        <FormSelect
          selectId="interview-application"
          label="Candidate Application"
          value={selectedApplicationId}
          options={applicationSelectOptions}
          onValueChange={setSelectedApplicationId}
          helperText="Only non-rejected applications belonging to your jobs are listed."
          isRequired
          isDisabled={isSubmitting}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          inputId="interviewer-name"
          label="Interviewer Name"
          value={interviewerName}
          onValueChange={setInterviewerName}
          placeholder="e.g. Karthik Rao"
          isRequired
          isDisabled={isSubmitting}
        />

        <FormInput
          inputId="interviewer-email"
          label="Interviewer Email (optional)"
          inputType="email"
          value={interviewerEmail}
          onValueChange={setInterviewerEmail}
          placeholder="karthik@company.com"
          isDisabled={isSubmitting}
        />

        <FormSelect
          selectId="interview-round"
          label="Interview Round"
          value={interviewRound}
          options={ROUND_OPTIONS}
          onValueChange={(value) => setInterviewRound(value as InterviewRound)}
          isRequired
          isDisabled={isSubmitting}
        />

        <FormSelect
          selectId="interview-mode"
          label="Interview Mode"
          value={interviewMode}
          options={MODE_OPTIONS}
          onValueChange={(value) => setInterviewMode(value as InterviewMode)}
          isRequired
          isDisabled={isSubmitting}
        />

        <div className="space-y-1.5">
          <label
            htmlFor="interview-date-time"
            className="block text-sm font-medium text-slate-700"
          >
            Interview Date &amp; Time <span className="text-rose-500">*</span>
          </label>
          <input
            id="interview-date-time"
            type="datetime-local"
            value={interviewDate}
            onChange={(event) => setInterviewDate(event.target.value)}
            disabled={isSubmitting}
            required
            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100"
          />
        </div>

        <FormInput
          inputId="interview-duration"
          label="Duration (minutes)"
          value={durationInput}
          onValueChange={setDurationInput}
          placeholder="45"
          helperText="Between 15 and 240 minutes."
          isRequired
          isDisabled={isSubmitting}
        />

        {mode === 'edit' && (
          <FormSelect
            selectId="interview-status"
            label="Interview Status"
            value={interviewStatus}
            options={STATUS_OPTIONS}
            onValueChange={(value) =>
              setInterviewStatus(value as InterviewStatus)
            }
            isRequired
            isDisabled={isSubmitting}
          />
        )}

        <FormInput
          inputId="interview-meeting-link"
          label="Meeting Link or Location (optional)"
          value={meetingLink}
          onValueChange={setMeetingLink}
          placeholder="https://meet.google.com/abc-defg-hij"
          isDisabled={isSubmitting}
        />
      </div>

      <FormTextarea
        textareaId="interviewer-notes"
        label="Preparation Notes / Agenda (optional)"
        rows={3}
        value={interviewerNotes}
        onValueChange={setInterviewerNotes}
        placeholder="Topics to cover, system design prompt, or panel instructions..."
        isDisabled={isSubmitting}
      />

      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
        {onCancel && (
          <FormButton
            variant="secondary"
            onClick={onCancel}
            isDisabled={isSubmitting}
          >
            Cancel
          </FormButton>
        )}
        <FormButton
          buttonType="submit"
          isLoading={isSubmitting}
          loadingLabel={mode === 'create' ? 'Scheduling...' : 'Saving changes...'}
        >
          {mode === 'create' ? 'Schedule Interview' : 'Save Interview Changes'}
        </FormButton>
      </div>
    </form>
  );
}
