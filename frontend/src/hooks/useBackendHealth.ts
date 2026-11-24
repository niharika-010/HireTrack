import { useCallback, useEffect, useState } from 'react';
import type { BackendConnectionState } from '../types/recruitment';
import { checkBackendHealth } from '../services/apiClient';

interface BackendHealthSnapshot {
  connectionState: BackendConnectionState;
  statusMessage: string;
}

interface BackendHealthHookResult extends BackendHealthSnapshot {
  recheckBackendHealth: () => Promise<void>;
}

/**
 * Calls the backend health endpoint and translates the result into UI state.
 */
async function fetchBackendHealthSnapshot(
  apiBaseUrl: string
): Promise<BackendHealthSnapshot> {
  try {
    const healthResponse = await checkBackendHealth(apiBaseUrl);
    const databaseLabel = healthResponse.databaseStatus
      ? `, database: ${healthResponse.databaseStatus}`
      : '';
    return {
      connectionState: 'connected',
      statusMessage: `Connected to ${healthResponse.serviceName} (status: ${healthResponse.status}${databaseLabel})`,
    };
  } catch {
    return {
      connectionState: 'unreachable',
      statusMessage:
        'Backend server is not reachable yet. Start the Loco.rs server on port 5150 to connect.',
    };
  }
}

/**
 * React hook that checks whether the Loco.rs backend API is running and reachable.
 */
export function useBackendHealth(apiBaseUrl: string): BackendHealthHookResult {
  const [healthSnapshot, setHealthSnapshot] = useState<BackendHealthSnapshot>({
    connectionState: 'checking',
    statusMessage: 'Checking backend server connection...',
  });

  // Check backend health once when the component mounts or apiBaseUrl changes.
  useEffect(() => {
    let isCancelled = false;

    fetchBackendHealthSnapshot(apiBaseUrl).then((latestSnapshot) => {
      if (!isCancelled) {
        setHealthSnapshot(latestSnapshot);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl]);

  // Manual recheck triggered when the user clicks the button in the UI.
  const recheckBackendHealth = useCallback(async () => {
    setHealthSnapshot({
      connectionState: 'checking',
      statusMessage: 'Checking backend server connection...',
    });

    const latestSnapshot = await fetchBackendHealthSnapshot(apiBaseUrl);
    setHealthSnapshot(latestSnapshot);
  }, [apiBaseUrl]);

  return {
    connectionState: healthSnapshot.connectionState,
    statusMessage: healthSnapshot.statusMessage,
    recheckBackendHealth,
  };
}
