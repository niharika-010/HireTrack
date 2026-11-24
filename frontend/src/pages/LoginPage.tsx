import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { FormAlert } from '../components/forms/FormAlert';
import { FormButton } from '../components/forms/FormButton';
import { FormInput } from '../components/forms/FormInput';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../layouts/AuthLayout';
import {
  getDashboardPathForRole,
  validateEmailInput,
} from '../utils/authHelpers';

/**
 * Login page allowing existing Admin, Recruiter, and Candidate accounts to sign in.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, loginUser } = useAuth();

  const [userEmail, setUserEmail] = useState<string>('');
  const [userPassword, setUserPassword] = useState<string>('');
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null);
  const [passwordFieldError, setPasswordFieldError] = useState<string | null>(
    null
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Redirect already logged-in users directly to their role workspace.
  if (isAuthenticated && currentUser) {
    return (
      <Navigate to={getDashboardPathForRole(currentUser.userRole)} replace />
    );
  }

  /**
   * Validates login inputs and populates accessible per-field error messages.
   */
  function validateLoginFields(): boolean {
    const emailError = validateEmailInput(userEmail);
    const passwordError =
      userPassword.length === 0 ? 'Password is required.' : null;

    setEmailFieldError(emailError);
    setPasswordFieldError(passwordError);

    return emailError === null && passwordError === null;
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    if (!validateLoginFields()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const authenticatedUser = await loginUser({
        userEmail: userEmail.trim(),
        userPassword,
      });

      const dashboardPath = getDashboardPathForRole(authenticatedUser.userRole);
      navigate(dashboardPath, { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign in right now.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      heading="Welcome back"
      subheading="Sign in with your HireTrack email and password."
    >
      <form
        onSubmit={(event) => void handleLoginSubmit(event)}
        noValidate
        className="space-y-4"
      >
        {serverError && <FormAlert variant="error" message={serverError} />}

        <FormInput
          inputId="login-email"
          label="Email address"
          inputType="email"
          value={userEmail}
          onValueChange={(nextValue) => {
            setUserEmail(nextValue);
            setEmailFieldError(null);
          }}
          placeholder="you@company.com"
          autoComplete="email"
          errorMessage={emailFieldError}
          isRequired
          isDisabled={isSubmitting}
        />

        <FormInput
          inputId="login-password"
          label="Password"
          inputType="password"
          value={userPassword}
          onValueChange={(nextValue) => {
            setUserPassword(nextValue);
            setPasswordFieldError(null);
          }}
          placeholder="Enter your password"
          autoComplete="current-password"
          errorMessage={passwordFieldError}
          isRequired
          isDisabled={isSubmitting}
        />

        <div className="pt-1">
          <FormButton
            buttonType="submit"
            isFullWidth
            isLoading={isSubmitting}
            loadingLabel="Signing in..."
          >
            Sign In
          </FormButton>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New to HireTrack?{' '}
        <Link
          to="/register"
          className="font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
