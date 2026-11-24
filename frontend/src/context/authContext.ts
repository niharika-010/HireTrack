import { createContext } from 'react';
import type {
  AuthenticatedUserProfile,
  LoginUserPayload,
  RegisterUserPayload,
} from '../types/auth';

export interface AuthContextValue {
  currentUser: AuthenticatedUserProfile | null;
  authToken: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  loginUser: (payload: LoginUserPayload) => Promise<AuthenticatedUserProfile>;
  registerUser: (payload: RegisterUserPayload) => Promise<AuthenticatedUserProfile>;
  logoutUser: () => Promise<void>;
}

// React context holding the authenticated user's session state and auth actions.
export const AuthContext = createContext<AuthContextValue | null>(null);
