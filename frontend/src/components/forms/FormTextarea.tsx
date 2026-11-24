import type { ChangeEvent } from 'react';

export interface FormTextareaProps {
  textareaId: string;
  label: string;
  value: string;
  onValueChange: (nextValue: string) => void;
  placeholder?: string;
  rows?: number;
  helperText?: string;
  errorMessage?: string | null;
  isRequired?: boolean;
  isDisabled?: boolean;
}

/**
 * Accessible reusable multi-line textarea field with label, helper text, and inline error state.
 */
export function FormTextarea({
  textareaId,
  label,
  value,
  onValueChange,
  placeholder,
  rows = 4,
  helperText,
  errorMessage,
  isRequired = false,
  isDisabled = false,
}: FormTextareaProps) {
  const hasError = Boolean(errorMessage);
  const describedById = hasError
    ? `${textareaId}-error`
    : helperText
      ? `${textareaId}-helper`
      : undefined;

  function handleTextareaChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onValueChange(event.target.value);
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={textareaId}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
        {isRequired && (
          <span className="ml-1 text-rose-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <textarea
        id={textareaId}
        rows={rows}
        value={value}
        onChange={handleTextareaChange}
        placeholder={placeholder}
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
        <p id={`${textareaId}-error`} className="text-xs font-medium text-rose-600">
          {errorMessage}
        </p>
      ) : helperText ? (
        <p id={`${textareaId}-helper`} className="text-xs text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
