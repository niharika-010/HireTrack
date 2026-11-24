import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FormAlert } from '../components/forms/FormAlert';
import { JobForm } from '../components/jobs/JobForm';
import type { JobFormValues } from '../components/jobs/JobForm';
import { LoadingState } from '../components/LoadingState';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { fetchJobDetails, updateJobOpening } from '../services/jobService';
import type { JobOpening } from '../types/job';

/**
 * Recruiter page for editing an existing job opening via GET + PUT /api/jobs/:id.
 */
export function EditJobPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { apiBaseUrl } = useAppConfig();
  const { authToken } = useAuth();

  const parsedJobId = Number(jobId);
  const isValidJobId = Number.isInteger(parsedJobId) && parsedJobId > 0;

  const [existingJob, setExistingJob] = useState<JobOpening | null>(null);
  const [isLoadingJob, setIsLoadingJob] = useState<boolean>(isValidJobId);
  const [loadError, setLoadError] = useState<string | null>(
    isValidJobId ? null : 'Invalid job ID.'
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!authToken || !isValidJobId) {
      return;
    }

    let isCancelled = false;

    fetchJobDetails(apiBaseUrl, authToken, parsedJobId)
      .then((response) => {
        if (!isCancelled) {
          setExistingJob(response.job);
          setLoadError(null);
          setIsLoadingJob(false);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load job details for editing.';
          setLoadError(message);
          setIsLoadingJob(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, authToken, parsedJobId, isValidJobId]);

  async function handleUpdateJob(values: JobFormValues) {
    if (!authToken || !isValidJobId) {
      return;
    }

    setSaveError(null);
    setIsSaving(true);

    try {
      await updateJobOpening(apiBaseUrl, authToken, parsedJobId, {
        jobTitle: values.jobTitle,
        department: values.department,
        jobLocation: values.jobLocation,
        employmentType: values.employmentType,
        salaryMin: values.salaryMin,
        salaryMax: values.salaryMax,
        jobDescription: values.jobDescription,
        requirements: values.requirements,
        jobStatus: values.jobStatus,
      });

      navigate(`/jobs/${parsedJobId}`, { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to save job updates right now.';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DashboardLayout pageTitle="Edit Job Opening">
      <div className="mx-auto max-w-3xl space-y-6">
        {loadError && <FormAlert variant="error" message={loadError} />}

        {isLoadingJob ? (
          <LoadingState message="Loading job details..." />
        ) : existingJob ? (
          <>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Edit &ldquo;{existingJob.jobTitle}&rdquo;
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Update role details, compensation range, or change status
                between Open, Paused, and Closed.
              </p>
            </div>

            <JobForm
              initialValues={{
                jobTitle: existingJob.jobTitle,
                department: existingJob.department,
                jobLocation: existingJob.jobLocation,
                employmentType: existingJob.employmentType,
                salaryMin: existingJob.salaryMin,
                salaryMax: existingJob.salaryMax,
                jobDescription: existingJob.jobDescription,
                requirements: existingJob.requirements,
                jobStatus: existingJob.jobStatus,
              }}
              showStatusField
              submitButtonLabel="Save Changes"
              submittingLabel="Saving changes..."
              serverError={saveError}
              isSubmitting={isSaving}
              onSubmitJob={handleUpdateJob}
              onCancel={() => navigate('/recruiter/jobs')}
            />
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
