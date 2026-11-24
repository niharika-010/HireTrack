use axum::{
    extract::{Path, Query},
    http::StatusCode,
    Json,
};
use loco_rs::prelude::*;
use serde::Serialize;

use crate::{
    middleware::auth::AuthenticatedUser,
    services::job_service::{
        close_job, create_job, delete_job, get_job_by_id, list_jobs, update_job, CreateJobInput,
        JobResponse, JobSearchFilters, JobServiceError, UpdateJobInput,
    },
};

/// Response returned when creating, viewing, updating, or closing a single job opening.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SingleJobResponse {
    message: String,
    job: JobResponse,
}

/// Response returned when listing job openings.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct JobListResponse {
    jobs: Vec<JobResponse>,
    total_count: usize,
}

/// Simple JSON message payload for delete confirmation.
#[derive(Debug, Serialize)]
struct DeleteJobResponse {
    message: String,
}

/// Consistent JSON error payload for job controller failures.
#[derive(Debug, Serialize)]
struct JobErrorBody {
    error: String,
}

/// Maps domain job errors to explicit HTTP status codes and readable JSON messages.
fn build_job_error_response(error: JobServiceError) -> Response {
    let (status_code, message) = match error {
        JobServiceError::Validation(msg) => (StatusCode::BAD_REQUEST, msg),
        JobServiceError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg),
        JobServiceError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
        JobServiceError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
    };

    (status_code, Json(JobErrorBody { error: message })).into_response()
}

/// POST /api/jobs — Creates a new job opening (Recruiters only).
pub async fn create_job_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Json(payload): Json<CreateJobInput>,
) -> Result<Response> {
    match create_job(&ctx, &authenticated_user, payload).await {
        Ok(created_job) => {
            let response_body = SingleJobResponse {
                message: String::from("Job opening created successfully."),
                job: created_job,
            };
            Ok((StatusCode::CREATED, Json(response_body)).into_response())
        }
        Err(service_error) => Ok(build_job_error_response(service_error)),
    }
}

/// GET /api/jobs — Lists job openings with optional search and filtering.
pub async fn list_jobs_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Query(filters): Query<JobSearchFilters>,
) -> Result<Response> {
    match list_jobs(&ctx, &authenticated_user, filters).await {
        Ok(job_list) => {
            let total_count = job_list.len();
            let response_body = JobListResponse {
                jobs: job_list,
                total_count,
            };
            Ok((StatusCode::OK, Json(response_body)).into_response())
        }
        Err(service_error) => Ok(build_job_error_response(service_error)),
    }
}

/// GET /api/jobs/{id} — Retrieves full details for one job opening.
pub async fn get_job_details_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Path(job_id): Path<i32>,
) -> Result<Response> {
    match get_job_by_id(&ctx, &authenticated_user, job_id).await {
        Ok(job_details) => {
            let response_body = SingleJobResponse {
                message: String::from("Job details loaded successfully."),
                job: job_details,
            };
            Ok((StatusCode::OK, Json(response_body)).into_response())
        }
        Err(service_error) => Ok(build_job_error_response(service_error)),
    }
}

/// PUT /api/jobs/{id} — Updates an existing job opening (owning Recruiter only).
pub async fn update_job_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Path(job_id): Path<i32>,
    Json(payload): Json<UpdateJobInput>,
) -> Result<Response> {
    match update_job(&ctx, &authenticated_user, job_id, payload).await {
        Ok(updated_job) => {
            let response_body = SingleJobResponse {
                message: String::from("Job opening updated successfully."),
                job: updated_job,
            };
            Ok((StatusCode::OK, Json(response_body)).into_response())
        }
        Err(service_error) => Ok(build_job_error_response(service_error)),
    }
}

/// PATCH /api/jobs/{id}/close — Closes a job opening so it is hidden from candidates.
pub async fn close_job_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Path(job_id): Path<i32>,
) -> Result<Response> {
    match close_job(&ctx, &authenticated_user, job_id).await {
        Ok(closed_job) => {
            let response_body = SingleJobResponse {
                message: String::from("Job opening closed successfully."),
                job: closed_job,
            };
            Ok((StatusCode::OK, Json(response_body)).into_response())
        }
        Err(service_error) => Ok(build_job_error_response(service_error)),
    }
}

/// DELETE /api/jobs/{id} — Permanently deletes a job opening (owning Recruiter or Admin).
pub async fn delete_job_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Path(job_id): Path<i32>,
) -> Result<Response> {
    match delete_job(&ctx, &authenticated_user, job_id).await {
        Ok(()) => {
            let response_body = DeleteJobResponse {
                message: String::from("Job opening deleted successfully."),
            };
            Ok((StatusCode::OK, Json(response_body)).into_response())
        }
        Err(service_error) => Ok(build_job_error_response(service_error)),
    }
}

/// Registers all job CRUD routes under /api/jobs.
pub fn routes() -> Routes {
    Routes::new()
        .prefix("api/jobs")
        .add("/", get(list_jobs_handler).post(create_job_handler))
        .add(
            "/{id}",
            get(get_job_details_handler)
                .put(update_job_handler)
                .delete(delete_job_handler),
        )
        .add("/{id}/close", patch(close_job_handler))
}
