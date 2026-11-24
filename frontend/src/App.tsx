import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import {
  AppConfigContext,
  defaultApplicationConfiguration,
} from './context/appConfigContext';
import { AuthProvider } from './context/AuthProvider';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ApplicationDetailsPage } from './pages/ApplicationDetailsPage';
import { BrowseJobsPage } from './pages/BrowseJobsPage';
import { CandidateDashboardPage } from './pages/CandidateDashboardPage';
import { CandidateProfilePage } from './pages/CandidateProfilePage';
import { CreateJobPage } from './pages/CreateJobPage';
import { EditJobPage } from './pages/EditJobPage';
import { HomePage } from './pages/HomePage';
import { InterviewDetailsPage } from './pages/InterviewDetailsPage';
import { InterviewResultsPage } from './pages/InterviewResultsPage';
import { JobDetailsPage } from './pages/JobDetailsPage';
import { LoginPage } from './pages/LoginPage';
import { ManageJobsPage } from './pages/ManageJobsPage';
import { MyApplicationsPage } from './pages/MyApplicationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RecruiterApplicationsPage } from './pages/RecruiterApplicationsPage';
import { RecruiterDashboardPage } from './pages/RecruiterDashboardPage';
import { RegisterPage } from './pages/RegisterPage';
import { ScheduleInterviewPage } from './pages/ScheduleInterviewPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { UpcomingInterviewsPage } from './pages/UpcomingInterviewsPage';

/**
 * Root React component configuring HireTrack context providers and role-protected routes.
 */
function App() {
  return (
    <AppConfigContext.Provider value={defaultApplicationConfiguration}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Role-specific protected dashboards */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruiter/dashboard"
              element={
                <ProtectedRoute allowedRoles={['recruiter']}>
                  <RecruiterDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/dashboard"
              element={
                <ProtectedRoute allowedRoles={['candidate']}>
                  <CandidateDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Job Management routes */}
            <Route
              path="/recruiter/jobs"
              element={
                <ProtectedRoute allowedRoles={['recruiter']}>
                  <ManageJobsPage scope="recruiter" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruiter/jobs/new"
              element={
                <ProtectedRoute allowedRoles={['recruiter']}>
                  <CreateJobPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruiter/jobs/:jobId/edit"
              element={
                <ProtectedRoute allowedRoles={['recruiter']}>
                  <EditJobPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/jobs"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ManageJobsPage scope="admin" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute
                  allowedRoles={['admin', 'recruiter', 'candidate']}
                >
                  <BrowseJobsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:jobId"
              element={
                <ProtectedRoute
                  allowedRoles={['admin', 'recruiter', 'candidate']}
                >
                  <JobDetailsPage />
                </ProtectedRoute>
              }
            />

            {/* Candidate Profile, Resume & Applications routes */}
            <Route
              path="/candidate/profile"
              element={
                <ProtectedRoute allowedRoles={['candidate']}>
                  <CandidateProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/applications"
              element={
                <ProtectedRoute allowedRoles={['candidate']}>
                  <MyApplicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruiter/applications"
              element={
                <ProtectedRoute allowedRoles={['recruiter']}>
                  <RecruiterApplicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/:applicationId"
              element={
                <ProtectedRoute
                  allowedRoles={['admin', 'recruiter', 'candidate']}
                >
                  <ApplicationDetailsPage />
                </ProtectedRoute>
              }
            />

            {/* Interview Management routes */}
            <Route
              path="/recruiter/interviews/new"
              element={
                <ProtectedRoute allowedRoles={['recruiter']}>
                  <ScheduleInterviewPage mode="create" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruiter/interviews/:interviewId/edit"
              element={
                <ProtectedRoute allowedRoles={['recruiter']}>
                  <ScheduleInterviewPage mode="edit" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interviews/upcoming"
              element={
                <ProtectedRoute
                  allowedRoles={['admin', 'recruiter', 'candidate']}
                >
                  <UpcomingInterviewsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interviews/results"
              element={
                <ProtectedRoute
                  allowedRoles={['admin', 'recruiter', 'candidate']}
                >
                  <InterviewResultsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interviews/:interviewId"
              element={
                <ProtectedRoute
                  allowedRoles={['admin', 'recruiter', 'candidate']}
                >
                  <InterviewDetailsPage />
                </ProtectedRoute>
              }
            />

            {/* Shared authenticated account profile page */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute
                  allowedRoles={['admin', 'recruiter', 'candidate']}
                >
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AppConfigContext.Provider>
  );
}

export default App;
