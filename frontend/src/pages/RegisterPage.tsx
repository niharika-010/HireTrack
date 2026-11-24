import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { FormAlert } from '../components/forms/FormAlert';
import { FormButton } from '../components/forms/FormButton';
import { FormInput } from '../components/forms/FormInput';
import { FormSelect } from '../components/forms/FormSelect';
import type { SelectOptionItem } from '../components/forms/FormSelect';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../layouts/AuthLayout';
import type { UserRole } from '../types/auth';
import {
  getDashboardPathForRole,
  validateEmailInput,
  validatePasswordInput,
} from '../utils/authHelpers';

const ACCOUNT_ROLE_OPTIONS: SelectOptionItem[] = [
  { value: 'candidate', label: 'Candidate — Seeking opportunities' },
  { value: 'recruiter', label: 'Recruiter — Hiring for a company' },
  { value: 'admin', label: 'Admin — Platform administrator' },
];

interface RegistrationFieldErrors {
  fullName: string | null;
  userEmail: string | null;
  companyName: string | null;
  userPassword: string | null;
  confirmPassword: string | null;
}

const EMPTY_FIELD_ERRORS: RegistrationFieldErrors = {
  fullName: null,
  userEmail: null,
  companyName: null,
  userPassword: null,
  confirmPassword: null,
};

/**
 * Registration page allowing new Candidate, Recruiter, and Admin accounts to sign up.
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, registerUser } = useAuth();

  const [fullName, setFullName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userRole, setUserRole] = useState<UserRole>('candidate');
  const [companyName, setCompanyName] = useState<string>('');
  const [userPassword, setUserPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [fieldErrors, setFieldErrors] =
    useState<RegistrationFieldErrors>(EMPTY_FIELD_ERRORS);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Redirect already authenticated users directly to their role workspace.
  if (isAuthenticated && currentUser) {
    return (
      <Navigate to={getDashboardPathForRole(currentUser.userRole)} replace />
    );
  }

  /**
   * Validates all registration inputs and reports clear per-field errors.
   */
  function validateRegistrationFields(): boolean {
    const nextErrors: RegistrationFieldErrors = {
      fullName:
        fullName.trim().length < 2
          ? 'Full name must be at least 2 characters long.'
          : null,
      userEmail: validateEmailInput(userEmail),
      companyName:
        userRole === 'recruiter' && companyName.trim().length < 2
          ? 'Company name is required for recruiter accounts.'
          : null,
      userPassword: validatePasswordInput(userPassword),
      confirmPassword:
        userPassword !== confirmPassword ? 'Passwords do not match.' : null,
    };

    setFieldErrors(nextErrors);

    return Object.values(nextErrors).every((error) => error === null);
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    if (!validateRegistrationFields()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const createdUser = await registerUser({
        fullName: fullName.trim(),
        userEmail: userEmail.trim(),
        userPassword,
        userRole,
        companyName: userRole === 'recruiter' ? companyName.trim() : undefined,
      });

      const dashboardPath = getDashboardPathForRole(createdUser.userRole);
      navigate(dashboardPath, { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to complete registration right now.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      heading="Create your account"
      subheading="Choose your role to get started with HireTrack."
    >
      <form
        onSubmit={(event) => void handleRegisterSubmit(event)}
        noValidate
        className="space-y-4"
      >
        {serverError && <FormAlert variant="error" message={serverError} />}

        <FormInput
          inputId="register-full-name"
          label="Full name"
          value={fullName}
          onValueChange={(nextValue) => {
            setFullName(nextValue);
            setFieldErrors((prev) => ({ ...prev, fullName: null }));
          }}
          placeholder="Priya Nair"
          autoComplete="name"
          errorMessage={fieldErrors.fullName}
          isRequired
          isDisabled={isSubmitting}
        />

        <FormInput
          inputId="register-email"
          label="Email address"
          inputType="email"
          value={userEmail}
          onValueChange={(nextValue) => {
            setUserEmail(nextValue);
            setFieldErrors((prev) => ({ ...prev, userEmail: null }));
          }}
          placeholder="priya@example.com"
          autoComplete="email"
          errorMessage={fieldErrors.userEmail}
          isRequired
          isDisabled={isSubmitting}
        />

        <FormSelect
          selectId="register-role"
          label="Account role"
          value={userRole}
          options={ACCOUNT_ROLE_OPTIONS}
          onValueChange={(nextRole) => {
            setUserRole(nextRole as UserRole);
            setFieldErrors((prev) => ({ ...prev, companyName: null }));
          }}
          helperText="Your dashboard and permissions adapt automatically to your role."
          isRequired
          isDisabled={isSubmitting}
        />

        {userRole === 'recruiter' && (
          <FormInput
            inputId="register-company"
            label="Company name"
            value={companyName}
            onValueChange={(nextValue) => {
              setCompanyName(nextValue);
              setFieldErrors((prev) => ({ ...prev, companyName: null }));
            }}
            placeholder="HireTrack Labs"
            errorMessage={fieldErrors.companyName}
            isRequired
            isDisabled={isSubmitting}
          />
        )}

        <FormInput
          inputId="register-password"
          label="Password"
          inputType="password"
          value={userPassword}
          onValueChange={(nextValue) => {
            setUserPassword(nextValue);
            setFieldErrors((prev) => ({ ...prev, userPassword: null }));
          }}
          placeholder="Minimum 8 characters"
          autoComplete="new-password"
          helperText="Passwords are hashed with Argon2id on the server."
          errorMessage={fieldErrors.userPassword}
          isRequired
          isDisabled={isSubmitting}
        />

        <FormInput
          inputId="register-confirm-password"
          label="Confirm password"
          inputType="password"
          value={confirmPassword}
          onValueChange={(nextValue) => {
            setConfirmPassword(nextValue);
            setFieldErrors((prev) => ({ ...prev, confirmPassword: null }));
          }}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          errorMessage={fieldErrors.confirmPassword}
          isRequired
          isDisabled={isSubmitting}
        />

        <div className="pt-1">
          <FormButton
            buttonType="submit"
            isFullWidth
            isLoading={isSubmitting}
            loadingLabel="Creating account..."
          >
            Create Account
          </FormButton>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
