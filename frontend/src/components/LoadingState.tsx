export interface LoadingStateProps {
  message?: string;
}

/**
 * Accessible loading card shown while fetching live data from the Loco.rs backend.
 */
export function LoadingState({
  message = 'Loading workspace data...',
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-xs"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent"
        aria-hidden="true"
      />
      <p className="mt-3 text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}
