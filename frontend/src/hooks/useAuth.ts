import { useContext } from 'react';
import { AuthContext } from '../context/authContext';
import type { AuthContextValue } from '../context/authContext';

/**
 * Custom hook to access the current authenticated user and auth actions.
 */
export function useAuth(): AuthContextValue {
  const authContextValue = useContext(AuthContext);

  if (!authContextValue) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return authContextValue;
}
