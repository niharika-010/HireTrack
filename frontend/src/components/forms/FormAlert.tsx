export type AlertVariant = 'error' | 'success' | 'info';

export interface FormAlertProps {
  variant: AlertVariant;
  message: string;
}

/**
 * Maps each alert variant to its border, background, and text colors.
 */
function getAlertColorClasses(variant: AlertVariant): string {
  if (variant === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-800';
  }

  if (variant === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  return 'border-indigo-200 bg-indigo-50 text-indigo-800';
}

/**
 * Reusable feedback banner for displaying form validation errors, API failures, or confirmations.
 */
export function FormAlert({ variant, message }: FormAlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-4 py-3 text-sm ${getAlertColorClasses(variant)}`}
    >
      {message}
    </div>
  );
}
