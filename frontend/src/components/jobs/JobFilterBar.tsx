import type { FormEvent } from 'react';
import { FormButton } from '../forms/FormButton';
import { FormInput } from '../forms/FormInput';
import { FormSelect } from '../forms/FormSelect';
import type { SelectOptionItem } from '../forms/FormSelect';
import type { EmploymentType, JobFilterParams, JobStatus } from '../../types/job';

export interface JobFilterBarProps {
  filters: JobFilterParams;
  showStatusFilter?: boolean;
  onFiltersChange: (nextFilters: JobFilterParams) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
}

const EMPLOYMENT_FILTER_OPTIONS: SelectOptionItem[] = [
  { value: '', label: 'All employment types' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
];

const STATUS_FILTER_OPTIONS: SelectOptionItem[] = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
];

/**
 * Reusable search and filter bar used on Browse Jobs and Manage Jobs pages.
 */
export function JobFilterBar({
  filters,
  showStatusFilter = false,
  onFiltersChange,
  onApplyFilters,
  onResetFilters,
}: JobFilterBarProps) {
  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApplyFilters();
  }

  return (
    <form
      onSubmit={handleFilterSubmit}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
    >
      <div
        className={`grid gap-4 sm:grid-cols-2 ${
          showStatusFilter ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        }`}
      >
        <FormInput
          inputId="filter-search"
          label="Search keywords"
          value={filters.search ?? ''}
          onValueChange={(nextSearch) =>
            onFiltersChange({ ...filters, search: nextSearch })
          }
          placeholder="Title, department, or keyword..."
        />

        <FormInput
          inputId="filter-location"
          label="Location"
          value={filters.jobLocation ?? ''}
          onValueChange={(nextLocation) =>
            onFiltersChange({ ...filters, jobLocation: nextLocation })
          }
          placeholder="e.g. Remote, Bengaluru"
        />

        <FormSelect
          selectId="filter-employment-type"
          label="Employment type"
          value={filters.employmentType ?? ''}
          options={EMPLOYMENT_FILTER_OPTIONS}
          onValueChange={(nextType) =>
            onFiltersChange({
              ...filters,
              employmentType: nextType as EmploymentType | '',
            })
          }
        />

        {showStatusFilter && (
          <FormSelect
            selectId="filter-job-status"
            label="Job status"
            value={filters.jobStatus ?? ''}
            options={STATUS_FILTER_OPTIONS}
            onValueChange={(nextStatus) =>
              onFiltersChange({
                ...filters,
                jobStatus: nextStatus as JobStatus | '',
              })
            }
          />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5">
        <FormButton variant="secondary" onClick={onResetFilters}>
          Reset
        </FormButton>
        <FormButton buttonType="submit">Apply Filters</FormButton>
      </div>
    </form>
  );
}
