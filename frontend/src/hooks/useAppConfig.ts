import { useContext } from 'react';
import { AppConfigContext } from '../context/appConfigContext';
import type { ApplicationConfiguration } from '../types/recruitment';

/**
 * Reads the shared HireTrack configuration values from React context.
 */
export function useAppConfig(): ApplicationConfiguration {
  return useContext(AppConfigContext);
}
