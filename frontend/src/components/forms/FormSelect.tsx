import type { ChangeEvent } from 'react';

export interface SelectOptionItem {
  value: string;
  label: string;
}

export interface FormSelectProps {
  selectId: string;
  label: string;
  value: string;
  options: SelectOptionItem[];
  onValueChange: (nextValue: string) => void;
  helperText?: string;
  errorMessage?: string | null;
  isRequired?: boolean;
  isDisabled?: boolean;
}

/**
 * Accessible reusable dropdown select field with consistent HireTrack styling and error states.
 */
export function FormSelect({
  selectId,
  label,
  value,
  options,
  onValueChange,
  helperText,
  errorMessage,
  isRequired = false,
  isDisabled = false,
}: FormSelectProps) {
  const hasError = Boolean(errorMessage);
  const describedById = hasError
    ? `${selectId}-error`
    : helperText
      ? `${selectId}-helper`
      : undefined;

  function handleSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    onValueChange(event.target.value);
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={selectId}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
        {isRequired && (
          <span className="ml-1 text-rose-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <select
        id={selectId}
        value={value}
        onChange={handleSelectChange}
        required={isRequired}
        disabled={isDisabled}
        aria-invalid={hasError}
        aria-describedby={describedById}
        className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 ${
          hasError
            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
            : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {hasError ? (
        <p id={`${selectId}-error`} className="text-xs font-medium text-rose-600">
          {errorMessage}
        </p>
      ) : helperText ? (
        <p id={`${selectId}-helper`} className="text-xs text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
