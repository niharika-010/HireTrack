use axum::{http::StatusCode, Json};
use loco_rs::prelude::*;
use serde::Serialize;

use crate::{
    middleware::auth::AuthenticatedUser,
    services::dashboard_service::{
        get_admin_dashboard_stats, get_candidate_dashboard_stats, get_recruiter_dashboard_stats,
        DashboardServiceError,
    },
};

#[derive(Debug, Serialize)]
struct DashboardErrorBody {
    error: String,
}

fn build_dashboard_error(error: DashboardServiceError) -> Response {
    let (status_code, message) = match error {
        DashboardServiceError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg),
        DashboardServiceError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
    };

    (status_code, Json(DashboardErrorBody { error: message })).into_response()
}

/// GET /api/dashboard/admin — Returns platform-wide recruitment analytics (Admin only).
pub async fn admin_dashboard_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
) -> Result<Response> {
    match get_admin_dashboard_stats(&ctx, &authenticated_user).await {
        Ok(stats) => Ok((StatusCode::OK, Json(stats)).into_response()),
        Err(error) => Ok(build_dashboard_error(error)),
    }
}

/// GET /api/dashboard/recruiter — Returns recruiter-scoped job, applicant, and interview analytics.
pub async fn recruiter_dashboard_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
) -> Result<Response> {
    match get_recruiter_dashboard_stats(&ctx, &authenticated_user).await {
        Ok(stats) => Ok((StatusCode::OK, Json(stats)).into_response()),
        Err(error) => Ok(build_dashboard_error(error)),
    }
}

/// GET /api/dashboard/candidate — Returns candidate-scoped application and interview analytics.
pub async fn candidate_dashboard_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
) -> Result<Response> {
    match get_candidate_dashboard_stats(&ctx, &authenticated_user).await {
        Ok(stats) => Ok((StatusCode::OK, Json(stats)).into_response()),
        Err(error) => Ok(build_dashboard_error(error)),
    }
}

/// Registers role-specific dashboard analytics routes under /api/dashboard.
pub fn routes() -> Routes {
    Routes::new()
        .prefix("api/dashboard")
        .add("/admin", get(admin_dashboard_handler))
        .add("/recruiter", get(recruiter_dashboard_handler))
        .add("/candidate", get(candidate_dashboard_handler))
}
