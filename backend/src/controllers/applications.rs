use axum::{
    extract::{Path, Query},
    http::StatusCode,
    Json,
};
use loco_rs::prelude::*;
use serde::Serialize;

use crate::{
    middleware::auth::AuthenticatedUser,
    services::application_service::{
        get_application_details, list_my_applications, list_recruiter_applications,
        submit_job_application, update_application_status, ApplicationDetailResponse,
        ApplicationListFilters, ApplicationServiceError, ApplicationSummaryResponse,
        SubmitApplicationInput, UpdateApplicationStatusInput,
    },
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ApplicationDetailPayload {
    message: String,
    application: ApplicationDetailResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ApplicationListPayload {
    applications: Vec<ApplicationSummaryResponse>,
    total_count: usize,
}

#[derive(Debug, Serialize)]
struct ApplicationErrorBody {
    error: String,
}

fn build_application_error_response(error: ApplicationServiceError) -> Response {
    let (status_code, message) = match error {
        ApplicationServiceError::Validation(msg) => (StatusCode::BAD_REQUEST, msg),
        ApplicationServiceError::DuplicateApplication(msg) => (StatusCode::CONFLICT, msg),
        ApplicationServiceError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg),
        ApplicationServiceError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
        ApplicationServiceError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
    };

    (status_code, Json(ApplicationErrorBody { error: message })).into_response()
}

/// POST /api/applications — Submits a candidate job application and prevents duplicates.
pub async fn submit_application_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Json(payload): Json<SubmitApplicationInput>,
) -> Result<Response> {
    match submit_job_application(&ctx, &authenticated_user, payload).await {
        Ok(application) => Ok((
            StatusCode::CREATED,
            Json(ApplicationDetailPayload {
                message: String::from("Application submitted successfully."),
                application,
            }),
        )
            .into_response()),
        Err(service_error) => Ok(build_application_error_response(service_error)),
    }
}

/// GET /api/applications/me — Lists all applications submitted by the logged-in candidate.
pub async fn list_candidate_applications_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Query(filters): Query<ApplicationListFilters>,
) -> Result<Response> {
    match list_my_applications(&ctx, &authenticated_user, filters).await {
        Ok(applications) => {
            let total_count = applications.len();
            Ok((
                StatusCode::OK,
                Json(ApplicationListPayload {
                    applications,
                    total_count,
                }),
            )
                .into_response())
        }
        Err(service_error) => Ok(build_application_error_response(service_error)),
    }
}

/// GET /api/applications/recruiter — Lists applications submitted to the logged-in recruiter's jobs.
pub async fn list_recruiter_applications_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Query(filters): Query<ApplicationListFilters>,
) -> Result<Response> {
    match list_recruiter_applications(&ctx, &authenticated_user, filters).await {
        Ok(applications) => {
            let total_count = applications.len();
            Ok((
                StatusCode::OK,
                Json(ApplicationListPayload {
                    applications,
                    total_count,
                }),
            )
                .into_response())
        }
        Err(service_error) => Ok(build_application_error_response(service_error)),
    }
}

/// GET /api/applications/{id} — Returns application details and status history to authorized viewers.
pub async fn get_application_details_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Path(application_id): Path<i32>,
) -> Result<Response> {
    match get_application_details(&ctx, &authenticated_user, application_id).await {
        Ok(application) => Ok((
            StatusCode::OK,
            Json(ApplicationDetailPayload {
                message: String::from("Application details loaded successfully."),
                application,
            }),
        )
            .into_response()),
        Err(service_error) => Ok(build_application_error_response(service_error)),
    }
}

/// PATCH /api/applications/{id}/status — Allows the owning recruiter to update application status and log history.
pub async fn update_application_status_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Path(application_id): Path<i32>,
    Json(payload): Json<UpdateApplicationStatusInput>,
) -> Result<Response> {
    match update_application_status(&ctx, &authenticated_user, application_id, payload).await {
        Ok(application) => Ok((
            StatusCode::OK,
            Json(ApplicationDetailPayload {
                message: String::from("Application status updated successfully."),
                application,
            }),
        )
            .into_response()),
        Err(service_error) => Ok(build_application_error_response(service_error)),
    }
}

/// Registers all job application endpoints under /api/applications.
pub fn routes() -> Routes {
    Routes::new()
        .prefix("api/applications")
        .add("/", post(submit_application_handler))
        .add("/me", get(list_candidate_applications_handler))
        .add("/recruiter", get(list_recruiter_applications_handler))
        .add("/{id}", get(get_application_details_handler))
        .add("/{id}/status", patch(update_application_status_handler))
}
