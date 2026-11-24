import type { BackendConnectionState } from '../types/recruitment';

interface StatusBadgeProps {
  connectionState: BackendConnectionState;
}

/**
 * Returns readable badge text and Tailwind color classes for a given connection state.
 */
function getStatusBadgeAppearance(connectionState: BackendConnectionState): {
  label: string;
  colorClasses: string;
} {
  if (connectionState === 'connected') {
    return {
      label: 'Backend Connected',
      colorClasses: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
  }

  if (connectionState === 'checking') {
    return {
      label: 'Checking Backend',
      colorClasses: 'bg-amber-100 text-amber-800 border-amber-200',
    };
  }

  return {
    label: 'Backend Offline',
    colorClasses: 'bg-rose-100 text-rose-800 border-rose-200',
  };
}

/**
 * Displays a pill-shaped status badge indicating backend connectivity.
 */
export function StatusBadge({ connectionState }: StatusBadgeProps) {
  const { label, colorClasses } = getStatusBadgeAppearance(connectionState);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${colorClasses}`}
    >
      {label}
    </span>
  );
}
