import { useState } from 'react';
import type { FormEvent } from 'react';
import { FormAlert } from '../forms/FormAlert';
import { FormButton } from '../forms/FormButton';
import { FormInput } from '../forms/FormInput';
import { FormTextarea } from '../forms/FormTextarea';
import type {
  CandidateProfile,
  UpdateCandidateProfilePayload,
} from '../../types/candidate';

export interface CandidateProfileFormProps {
  initialProfile: CandidateProfile;
  isSaving: boolean;
  serverError: string | null;
  successMessage: string | null;
  onSaveProfile: (payload: UpdateCandidateProfilePayload) => Promise<void>;
}

/**
 * Reusable form allowing candidates to update their contact info, location, experience, and skills.
 */
export function CandidateProfileForm({
  initialProfile,
  isSaving,
  serverError,
  successMessage,
  onSaveProfile,
}: CandidateProfileFormProps) {
  const [phoneNumber, setPhoneNumber] = useState<string>(
    initialProfile.phoneNumber ?? ''
  );
  const [currentLocation, setCurrentLocation] = useState<string>(
    initialProfile.currentLocation ?? ''
  );
  const [experienceInput, setExperienceInput] = useState<string>(
    String(initialProfile.yearsOfExperience)
  );
  const [skillsSummary, setSkillsSummary] = useState<string>(
    initialProfile.skillsSummary ?? ''
  );
  const [experienceError, setExperienceError] = useState<string | null>(null);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExperienceError(null);

    const parsedYears = Number(experienceInput.trim());
    if (!Number.isInteger(parsedYears) || parsedYears < 0 || parsedYears > 60) {
      setExperienceError('Enter a whole number between 0 and 60.');
      return;
    }

    await onSaveProfile({
      phoneNumber: phoneNumber.trim().length > 0 ? phoneNumber.trim() : null,
      currentLocation:
        currentLocation.trim().length > 0 ? currentLocation.trim() : null,
      yearsOfExperience: parsedYears,
      skillsSummary:
        skillsSummary.trim().length > 0 ? skillsSummary.trim() : null,
    });
  }

  return (
    <form
      onSubmit={(event) => void handleProfileSubmit(event)}
      noValidate
      className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
    >
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          Candidate Profile Details
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Recruiters see these details alongside your job applications.
        </p>
      </div>

      {serverError && <FormAlert variant="error" message={serverError} />}
      {successMessage && (
        <FormAlert variant="success" message={successMessage} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          inputId="candidate-phone"
          label="Phone Number"
          value={phoneNumber}
          onValueChange={setPhoneNumber}
          placeholder="+91 98765 43210"
          isDisabled={isSaving}
        />

        <FormInput
          inputId="candidate-location"
          label="Current Location"
          value={currentLocation}
          onValueChange={setCurrentLocation}
          placeholder="Bengaluru, India"
          isDisabled={isSaving}
        />

        <FormInput
          inputId="candidate-experience"
          label="Years of Experience"
          value={experienceInput}
          onValueChange={(nextValue) => {
            setExperienceInput(nextValue);
            setExperienceError(null);
          }}
          placeholder="0"
          errorMessage={experienceError}
          isRequired
          isDisabled={isSaving}
        />
      </div>

      <FormTextarea
        textareaId="candidate-skills"
        label="Skills & Summary"
        rows={4}
        value={skillsSummary}
        onValueChange={setSkillsSummary}
        placeholder="e.g. Rust, TypeScript, React, PostgreSQL, REST APIs..."
        isDisabled={isSaving}
      />

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <FormButton
          buttonType="submit"
          isLoading={isSaving}
          loadingLabel="Saving profile..."
        >
          Save Candidate Profile
        </FormButton>
      </div>
    </form>
  );
}
