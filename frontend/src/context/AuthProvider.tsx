import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './authContext';
import { useAppConfig } from '../hooks/useAppConfig';
import {
  fetchCurrentUser,
  loginAccount,
  logoutAccount,
  registerAccount,
} from '../services/authService';
import type {
  AuthenticatedUserProfile,
  LoginUserPayload,
  RegisterUserPayload,
} from '../types/auth';

const AUTH_TOKEN_STORAGE_KEY = 'hiretrack_auth_token';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Reads any previously saved JWT from browser localStorage.
 * Note: Only the signed session token is stored here — never the server's JWT secret.
 */
function readStoredAuthToken(): string | null {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Saves or removes the active JWT in browser localStorage.
 */
function persistAuthToken(authToken: string | null): void {
  try {
    if (authToken) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted browser contexts.
  }
}

/**
 * Provides authentication state, session restoration, login, registration, and logout
 * across the entire HireTrack React application.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { apiBaseUrl } = useAppConfig();
  const initialStoredToken = readStoredAuthToken();

  const [authToken, setAuthToken] = useState<string | null>(initialStoredToken);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(
    initialStoredToken !== null
  );

  // Restore the user's session on initial page load if a stored token exists.
  useEffect(() => {
    if (!initialStoredToken) {
      return;
    }

    let isCancelled = false;

    fetchCurrentUser(apiBaseUrl, initialStoredToken)
      .then((response) => {
        if (!isCancelled) {
          setCurrentUser(response.user);
          setIsAuthLoading(false);
        }
      })
      .catch(() => {
        // Clear invalid, expired, or logged-out tokens automatically.
        if (!isCancelled) {
          persistAuthToken(null);
          setAuthToken(null);
          setCurrentUser(null);
          setIsAuthLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, initialStoredToken]);

  const loginUser = useCallback(
    async (payload: LoginUserPayload): Promise<AuthenticatedUserProfile> => {
      const authResponse = await loginAccount(apiBaseUrl, payload);
      persistAuthToken(authResponse.token);
      setAuthToken(authResponse.token);
      setCurrentUser(authResponse.user);
      return authResponse.user;
    },
    [apiBaseUrl]
  );

  const registerUser = useCallback(
    async (payload: RegisterUserPayload): Promise<AuthenticatedUserProfile> => {
      const authResponse = await registerAccount(apiBaseUrl, payload);
      persistAuthToken(authResponse.token);
      setAuthToken(authResponse.token);
      setCurrentUser(authResponse.user);
      return authResponse.user;
    },
    [apiBaseUrl]
  );

  const logoutUser = useCallback(async (): Promise<void> => {
    // Tell the backend to revoke the active token so it cannot be reused later.
    if (authToken) {
      try {
        await logoutAccount(apiBaseUrl, authToken);
      } catch {
        // Always clear local session state even if the network request fails.
      }
    }

    persistAuthToken(null);
    setAuthToken(null);
    setCurrentUser(null);
  }, [apiBaseUrl, authToken]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authToken,
        isAuthenticated: currentUser !== null && authToken !== null,
        isAuthLoading,
        loginUser,
        registerUser,
        logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
