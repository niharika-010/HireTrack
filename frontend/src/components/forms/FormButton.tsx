import type { ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface FormButtonProps {
  children: ReactNode;
  buttonType?: 'button' | 'submit' | 'reset';
  variant?: ButtonVariant;
  isLoading?: boolean;
  loadingLabel?: string;
  isFullWidth?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
}

/**
 * Returns Tailwind classes for the requested button visual style.
 */
function getButtonVariantClasses(variant: ButtonVariant): string {
  if (variant === 'secondary') {
    return 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus:ring-slate-300';
  }

  if (variant === 'danger') {
    return 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500';
  }

  return 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500';
}

/**
 * Reusable action button with built-in loading spinner and accessible disabled state.
 */
export function FormButton({
  children,
  buttonType = 'button',
  variant = 'primary',
  isLoading = false,
  loadingLabel = 'Please wait...',
  isFullWidth = false,
  isDisabled = false,
  onClick,
}: FormButtonProps) {
  const disabledState = isDisabled || isLoading;

  return (
    <button
      type={buttonType}
      disabled={disabledState}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        isFullWidth ? 'w-full' : ''
      } ${getButtonVariantClasses(variant)}`}
    >
      {isLoading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      <span>{isLoading ? loadingLabel : children}</span>
    </button>
  );
}
