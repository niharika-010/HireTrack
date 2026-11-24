import { createContext } from 'react';
import type { ApplicationConfiguration } from '../types/recruitment';
import { getApiBaseUrl } from '../services/apiClient';

/**
 * Builds the default application configuration from Vite environment variables.
 */
export function loadApplicationConfiguration(): ApplicationConfiguration {
  const applicationName = import.meta.env.VITE_APP_NAME || 'HireTrack';
  const environmentName = import.meta.env.VITE_APP_ENVIRONMENT || 'development';
  const apiBaseUrl = getApiBaseUrl();

  return {
    applicationName,
    apiBaseUrl,
    environmentName,
  };
}

export const defaultApplicationConfiguration = loadApplicationConfiguration();

// React context that shares HireTrack configuration values across the component tree.
export const AppConfigContext = createContext<ApplicationConfiguration>(
  defaultApplicationConfiguration
);
