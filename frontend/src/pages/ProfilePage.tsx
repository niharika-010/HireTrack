import { useCallback, useEffect, useState } from 'react';
import { FormAlert } from '../components/forms/FormAlert';
import { FormButton } from '../components/forms/FormButton';
import { LoadingState } from '../components/LoadingState';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { fetchCurrentUser } from '../services/authService';
import type { AuthenticatedUserProfile } from '../types/auth';
import { formatUserRoleLabel } from '../utils/authHelpers';

/**
 * Authenticated profile page displaying live user account details retrieved from GET /api/auth/me.
 */
export function ProfilePage() {
  const { apiBaseUrl } = useAppConfig();
  const { authToken, currentUser } = useAuth();

  const [profileData, setProfileData] =
    useState<AuthenticatedUserProfile | null>(currentUser);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(
    authToken !== null
  );
  const [profileError, setProfileError] = useState<string | null>(null);

  // Load fresh user details from the backend API whenever the profile page mounts.
  useEffect(() => {
    if (!authToken) {
      return;
    }

    let isCancelled = false;

    fetchCurrentUser(apiBaseUrl, authToken)
      .then((response) => {
        if (!isCancelled) {
          setProfileData(response.user);
          setProfileError(null);
          setIsLoadingProfile(false);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load profile details.';
          setProfileError(message);
          setIsLoadingProfile(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken]);

  const handleRefreshProfile = useCallback(async () => {
    if (!authToken) {
      return;
    }

    setIsLoadingProfile(true);
    setProfileError(null);

    try {
      const response = await fetchCurrentUser(apiBaseUrl, authToken);
      setProfileData(response.user);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to refresh profile details.';
      setProfileError(message);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [apiBaseUrl, authToken]);

  return (
    <DashboardLayout pageTitle="My Profile">
      <div className="space-y-6">
        {profileError && <FormAlert variant="error" message={profileError} />}

        {isLoadingProfile ? (
          <LoadingState message="Loading account profile from HireTrack API..." />
        ) : profileData ? (
          <>
            {/* Profile summary card */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                    {profileData.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {profileData.fullName}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {profileData.userEmail}
                    </p>
                  </div>
                </div>

                <FormButton
                  variant="secondary"
                  onClick={() => void handleRefreshProfile()}
                >
                  Refresh Profile
                </FormButton>
              </div>

              <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Account ID
                  </dt>
                  <dd className="mt-1 text-base font-semibold text-slate-900">
                    #{profileData.userId}
                  </dd>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Role
                  </dt>
                  <dd className="mt-1 text-base font-semibold text-indigo-700">
                    {formatUserRoleLabel(profileData.userRole)}
                  </dd>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Account Status
                  </dt>
                  <dd className="mt-1 text-base font-semibold text-emerald-700">
                    {profileData.isActive ? 'Active' : 'Inactive'}
                  </dd>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Authentication
                  </dt>
                  <dd className="mt-1 text-base font-semibold text-slate-900">
                    JWT (HS256)
                  </dd>
                </div>
              </dl>
            </section>

            {/* Security info card */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <h3 className="text-base font-semibold text-slate-900">
                Account Security &amp; Session
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Your session is authenticated against the Loco.rs backend using
                a signed JWT verified against PostgreSQL on every request.
                Clicking <strong>Logout</strong> immediately revokes your active
                token on the server.
              </p>
            </section>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
