import { useState } from 'react';
import type { FormEvent } from 'react';
import { FormAlert } from '../forms/FormAlert';
import { FormButton } from '../forms/FormButton';
import { FormInput } from '../forms/FormInput';
import { FormSelect } from '../forms/FormSelect';
import type { SelectOptionItem } from '../forms/FormSelect';
import { FormTextarea } from '../forms/FormTextarea';
import type { EmploymentType, JobStatus } from '../../types/job';

export interface JobFormValues {
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

export interface JobFormProps {
  initialValues?: Partial<JobFormValues>;
  showStatusField?: boolean;
  submitButtonLabel: string;
  submittingLabel: string;
  serverError: string | null;
  isSubmitting: boolean;
  onSubmitJob: (values: JobFormValues) => Promise<void>;
  onCancel?: () => void;
}

const EMPLOYMENT_TYPE_OPTIONS: SelectOptionItem[] = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
];

const JOB_STATUS_OPTIONS: SelectOptionItem[] = [
  { value: 'open', label: 'Open (Visible to candidates)' },
  { value: 'paused', label: 'Paused (Hidden from candidates)' },
  { value: 'closed', label: 'Closed (Hidden from candidates)' },
];

interface JobFormFieldErrors {
  jobTitle: string | null;
  department: string | null;
  jobLocation: string | null;
  salaryMin: string | null;
  salaryMax: string | null;
  jobDescription: string | null;
}

const EMPTY_ERRORS: JobFormFieldErrors = {
  jobTitle: null,
  department: null,
  jobLocation: null,
  salaryMin: null,
  salaryMax: null,
  jobDescription: null,
};

/**
 * Parses an optional numeric salary string input into a non-negative integer or null.
 */
function parseOptionalSalary(rawInput: string): {
  parsedValue: number | null;
  error: string | null;
} {
  const trimmed = rawInput.trim();
  if (trimmed.length === 0) {
    return { parsedValue: null, error: null };
  }

  const numericValue = Number(trimmed);
  if (!Number.isInteger(numericValue) || numericValue < 0) {
    return {
      parsedValue: null,
      error: 'Please enter a valid whole number (0 or greater).',
    };
  }

  return { parsedValue: numericValue, error: null };
}

/**
 * Reusable job form shared by the Create Job and Edit Job pages with full client-side validation.
 */
export function JobForm({
  initialValues,
  showStatusField = false,
  submitButtonLabel,
  submittingLabel,
  serverError,
  isSubmitting,
  onSubmitJob,
  onCancel,
}: JobFormProps) {
  const [jobTitle, setJobTitle] = useState<string>(
    initialValues?.jobTitle ?? ''
  );
  const [department, setDepartment] = useState<string>(
    initialValues?.department ?? ''
  );
  const [jobLocation, setJobLocation] = useState<string>(
    initialValues?.jobLocation ?? ''
  );
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    initialValues?.employmentType ?? 'full_time'
  );
  const [salaryMinInput, setSalaryMinInput] = useState<string>(
    initialValues?.salaryMin != null ? String(initialValues.salaryMin) : ''
  );
  const [salaryMaxInput, setSalaryMaxInput] = useState<string>(
    initialValues?.salaryMax != null ? String(initialValues.salaryMax) : ''
  );
  const [jobDescription, setJobDescription] = useState<string>(
    initialValues?.jobDescription ?? ''
  );
  const [requirements, setRequirements] = useState<string>(
    initialValues?.requirements ?? ''
  );
  const [jobStatus, setJobStatus] = useState<JobStatus>(
    initialValues?.jobStatus ?? 'open'
  );
  const [fieldErrors, setFieldErrors] =
    useState<JobFormFieldErrors>(EMPTY_ERRORS);

  /**
   * Validates all form fields and returns validated values if valid, or null otherwise.
   */
  function validateAndBuildValues(): JobFormValues | null {
    const parsedMin = parseOptionalSalary(salaryMinInput);
    const parsedMax = parseOptionalSalary(salaryMaxInput);

    let salaryMaxError = parsedMax.error;
    if (
      parsedMin.parsedValue !== null &&
      parsedMax.parsedValue !== null &&
      parsedMin.parsedValue > parsedMax.parsedValue
    ) {
      salaryMaxError = 'Maximum salary must be greater than or equal to minimum salary.';
    }

    const nextErrors: JobFormFieldErrors = {
      jobTitle:
        jobTitle.trim().length < 3
          ? 'Job title must be at least 3 characters long.'
          : null,
      department:
        department.trim().length < 2
          ? 'Department must be at least 2 characters long.'
          : null,
      jobLocation:
        jobLocation.trim().length < 2
          ? 'Job location must be at least 2 characters long.'
          : null,
      salaryMin: parsedMin.error,
      salaryMax: salaryMaxError,
      jobDescription:
        jobDescription.trim().length < 20
          ? 'Job description must be at least 20 characters long.'
          : null,
    };

    setFieldErrors(nextErrors);

    const hasAnyError = Object.values(nextErrors).some((error) => error !== null);
    if (hasAnyError) {
      return null;
    }

    const trimmedRequirements = requirements.trim();

    return {
      jobTitle: jobTitle.trim(),
      department: department.trim(),
      jobLocation: jobLocation.trim(),
      employmentType,
      salaryMin: parsedMin.parsedValue,
      salaryMax: parsedMax.parsedValue,
      jobDescription: jobDescription.trim(),
      requirements: trimmedRequirements.length > 0 ? trimmedRequirements : null,
      jobStatus,
    };
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validatedValues = validateAndBuildValues();
    if (!validatedValues) {
      return;
    }

    await onSubmitJob(validatedValues);
  }

  return (
    <form
      onSubmit={(event) => void handleFormSubmit(event)}
      noValidate
      className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
    >
      {serverError && <FormAlert variant="error" message={serverError} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormInput
            inputId="job-title"
            label="Job Title"
            value={jobTitle}
            onValueChange={(nextValue) => {
              setJobTitle(nextValue);
              setFieldErrors((prev) => ({ ...prev, jobTitle: null }));
            }}
            placeholder="e.g. Senior Rust Backend Engineer"
            errorMessage={fieldErrors.jobTitle}
            isRequired
            isDisabled={isSubmitting}
          />
        </div>

        <FormInput
          inputId="job-department"
          label="Department"
          value={department}
          onValueChange={(nextValue) => {
            setDepartment(nextValue);
            setFieldErrors((prev) => ({ ...prev, department: null }));
          }}
          placeholder="e.g. Engineering"
          errorMessage={fieldErrors.department}
          isRequired
          isDisabled={isSubmitting}
        />

        <FormInput
          inputId="job-location"
          label="Job Location"
          value={jobLocation}
          onValueChange={(nextValue) => {
            setJobLocation(nextValue);
            setFieldErrors((prev) => ({ ...prev, jobLocation: null }));
          }}
          placeholder="e.g. Bengaluru, India (Hybrid) or Remote"
          errorMessage={fieldErrors.jobLocation}
          isRequired
          isDisabled={isSubmitting}
        />

        <FormSelect
          selectId="job-employment-type"
          label="Employment Type"
          value={employmentType}
          options={EMPLOYMENT_TYPE_OPTIONS}
          onValueChange={(nextType) =>
            setEmploymentType(nextType as EmploymentType)
          }
          isRequired
          isDisabled={isSubmitting}
        />

        {showStatusField && (
          <FormSelect
            selectId="job-status"
            label="Job Status"
            value={jobStatus}
            options={JOB_STATUS_OPTIONS}
            onValueChange={(nextStatus) => setJobStatus(nextStatus as JobStatus)}
            isRequired
            isDisabled={isSubmitting}
          />
        )}

        <FormInput
          inputId="job-salary-min"
          label="Minimum Salary (USD, optional)"
          value={salaryMinInput}
          onValueChange={(nextValue) => {
            setSalaryMinInput(nextValue);
            setFieldErrors((prev) => ({ ...prev, salaryMin: null }));
          }}
          placeholder="e.g. 90000"
          errorMessage={fieldErrors.salaryMin}
          isDisabled={isSubmitting}
        />

        <FormInput
          inputId="job-salary-max"
          label="Maximum Salary (USD, optional)"
          value={salaryMaxInput}
          onValueChange={(nextValue) => {
            setSalaryMaxInput(nextValue);
            setFieldErrors((prev) => ({ ...prev, salaryMax: null }));
          }}
          placeholder="e.g. 130000"
          errorMessage={fieldErrors.salaryMax}
          isDisabled={isSubmitting}
        />
      </div>

      <FormTextarea
        textareaId="job-description"
        label="Job Description"
        rows={5}
        value={jobDescription}
        onValueChange={(nextValue) => {
          setJobDescription(nextValue);
          setFieldErrors((prev) => ({ ...prev, jobDescription: null }));
        }}
        placeholder="Describe the role, key responsibilities, team mission, and impact..."
        helperText="Minimum 20 characters."
        errorMessage={fieldErrors.jobDescription}
        isRequired
        isDisabled={isSubmitting}
      />

      <FormTextarea
        textareaId="job-requirements"
        label="Qualifications & Requirements (optional)"
        rows={4}
        value={requirements}
        onValueChange={setRequirements}
        placeholder="List required skills, years of experience, or preferred qualifications..."
        isDisabled={isSubmitting}
      />

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
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
          loadingLabel={submittingLabel}
        >
          {submitButtonLabel}
        </FormButton>
      </div>
    </form>
  );
}
