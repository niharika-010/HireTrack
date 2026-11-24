use axum::{
    extract::{Path, Query},
    http::StatusCode,
    Json,
};
use loco_rs::prelude::*;
use serde::Serialize;

use crate::{
    middleware::auth::AuthenticatedUser,
    services::interview_service::{
        get_interview_by_id, list_interviews, record_interview_feedback, schedule_interview,
        update_interview, InterviewListFilters, InterviewResponse, InterviewServiceError,
        RecordInterviewFeedbackInput, ScheduleInterviewInput, UpdateInterviewInput,
    },
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SingleInterviewPayload {
    message: String,
    interview: InterviewResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InterviewListPayload {
    interviews: Vec<InterviewResponse>,
    total_count: usize,
}

#[derive(Debug, Serialize)]
struct InterviewErrorBody {
    error: String,
}

fn build_interview_error_response(error: InterviewServiceError) -> Response {
    let (status_code, message) = match error {
        InterviewServiceError::Validation(msg) => (StatusCode::BAD_REQUEST, msg),
        InterviewServiceError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg),
        InterviewServiceError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
        InterviewServiceError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
    };

    (status_code, Json(InterviewErrorBody { error: message })).into_response()
}

/// POST /api/interviews — Schedules a technical or HR interview for an application (Recruiter only).
pub async fn schedule_interview_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Json(payload): Json<ScheduleInterviewInput>,
) -> Result<Response> {
    match schedule_interview(&ctx, &authenticated_user, payload).await {
        Ok(interview) => Ok((
            StatusCode::CREATED,
            Json(SingleInterviewPayload {
                message: String::from("Interview scheduled successfully."),
                interview,
            }),
        )
            .into_response()),
        Err(service_error) => Ok(build_interview_error_response(service_error)),
    }
}

/// GET /api/interviews — Lists role-scoped interviews (supports scope=upcoming|results and filters).
pub async fn list_interviews_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Query(filters): Query<InterviewListFilters>,
) -> Result<Response> {
    match list_interviews(&ctx, &authenticated_user, filters).await {
        Ok(interviews) => {
            let total_count = interviews.len();
            Ok((
                StatusCode::OK,
                Json(InterviewListPayload {
                    interviews,
                    total_count,
                }),
            )
                .into_response())
        }
        Err(service_error) => Ok(build_interview_error_response(service_error)),
    }
}

/// GET /api/interviews/{id} — Loads details for one interview.
pub async fn get_interview_details_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Path(interview_id): Path<i32>,
) -> Result<Response> {
    match get_interview_by_id(&ctx, &authenticated_user, interview_id).await {
        Ok(interview) => Ok((
            StatusCode::OK,
            Json(SingleInterviewPayload {
                message: String::from("Interview details loaded successfully."),
                interview,
            }),
        )
            .into_response()),
        Err(service_error) => Ok(build_interview_error_response(service_error)),
    }
}

/// PUT /api/interviews/{id} — Updates or reschedules an existing interview (owning Recruiter only).
pub async fn update_interview_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Path(interview_id): Path<i32>,
    Json(payload): Json<UpdateInterviewInput>,
) -> Result<Response> {
    match update_interview(&ctx, &authenticated_user, interview_id, payload).await {
        Ok(interview) => Ok((
            StatusCode::OK,
            Json(SingleInterviewPayload {
                message: String::from("Interview updated successfully."),
                interview,
            }),
        )
            .into_response()),
        Err(service_error) => Ok(build_interview_error_response(service_error)),
    }
}

/// PATCH /api/interviews/{id}/feedback — Records interview feedback, rating, and result (owning Recruiter only).
pub async fn record_feedback_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Path(interview_id): Path<i32>,
    Json(payload): Json<RecordInterviewFeedbackInput>,
) -> Result<Response> {
    match record_interview_feedback(&ctx, &authenticated_user, interview_id, payload).await {
        Ok(interview) => Ok((
            StatusCode::OK,
            Json(SingleInterviewPayload {
                message: String::from("Interview feedback recorded successfully."),
                interview,
            }),
        )
            .into_response()),
        Err(service_error) => Ok(build_interview_error_response(service_error)),
    }
}

/// Registers all interview management routes under /api/interviews.
pub fn routes() -> Routes {
    Routes::new()
        .prefix("api/interviews")
        .add("/", get(list_interviews_handler).post(schedule_interview_handler))
        .add("/{id}", get(get_interview_details_handler).put(update_interview_handler))
        .add("/{id}/feedback", patch(record_feedback_handler))
}
