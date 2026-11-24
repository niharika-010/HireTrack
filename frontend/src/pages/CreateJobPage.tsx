import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JobForm } from '../components/jobs/JobForm';
import type { JobFormValues } from '../components/jobs/JobForm';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { createJobOpening } from '../services/jobService';

/**
 * Recruiter page for publishing a new job opening via POST /api/jobs.
 */
export function CreateJobPage() {
  const navigate = useNavigate();
  const { apiBaseUrl } = useAppConfig();
  const { authToken } = useAuth();

  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  async function handleCreateJob(values: JobFormValues) {
    if (!authToken) {
      setServerError('You must be signed in as a recruiter to create a job.');
      return;
    }

    setServerError(null);
    setIsSubmitting(true);

    try {
      await createJobOpening(apiBaseUrl, authToken, {
        jobTitle: values.jobTitle,
        department: values.department,
        jobLocation: values.jobLocation,
        employmentType: values.employmentType,
        salaryMin: values.salaryMin,
        salaryMax: values.salaryMax,
        jobDescription: values.jobDescription,
        requirements: values.requirements,
        jobStatus: 'open',
      });

      navigate('/recruiter/jobs', { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to publish job opening right now.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DashboardLayout pageTitle="Create Job Opening">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Publish a new role
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Fill in the details below. Open jobs immediately become visible to
            candidates on the Browse Jobs page.
          </p>
        </div>

        <JobForm
          submitButtonLabel="Publish Job Opening"
          submittingLabel="Publishing..."
          serverError={serverError}
          isSubmitting={isSubmitting}
          onSubmitJob={handleCreateJob}
          onCancel={() => navigate('/recruiter/jobs')}
        />
      </div>
    </DashboardLayout>
  );
}
