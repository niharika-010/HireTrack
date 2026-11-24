import type { ChangeEvent } from 'react';

export interface FormInputProps {
  inputId: string;
  label: string;
  inputType?: 'text' | 'email' | 'password';
  value: string;
  onValueChange: (nextValue: string) => void;
  placeholder?: string;
  autoComplete?: string;
  helperText?: string;
  errorMessage?: string | null;
  isRequired?: boolean;
  isDisabled?: boolean;
}

/**
 * Accessible reusable text/email/password input field with label, helper text, and inline error display.
 */
export function FormInput({
  inputId,
  label,
  inputType = 'text',
  value,
  onValueChange,
  placeholder,
  autoComplete,
  helperText,
  errorMessage,
  isRequired = false,
  isDisabled = false,
}: FormInputProps) {
  const hasError = Boolean(errorMessage);
  const describedById = hasError
    ? `${inputId}-error`
    : helperText
      ? `${inputId}-helper`
      : undefined;

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    onValueChange(event.target.value);
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
        {isRequired && (
          <span className="ml-1 text-rose-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <input
        id={inputId}
        type={inputType}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={isRequired}
        disabled={isDisabled}
        aria-invalid={hasError}
        aria-describedby={describedById}
        className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 ${
          hasError
            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
            : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
        }`}
      />

      {hasError ? (
        <p id={`${inputId}-error`} className="text-xs font-medium text-rose-600">
          {errorMessage}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className="text-xs text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
