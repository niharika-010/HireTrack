use axum::{http::StatusCode, Json};
use loco_rs::prelude::*;
use serde::Serialize;

use crate::{
    middleware::auth::{ensure_user_has_role, AuthenticatedUser},
    services::auth_service::UserRole,
};

/// Response returned by role-protected endpoints to confirm authorized access.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoleProtectedResponse {
    pub message: String,
    pub area_name: String,
    pub user_email: String,
    pub user_role: String,
}

/// GET /api/protected/admin — Accessible only to users with the `admin` role.
pub async fn admin_area(authenticated_user: AuthenticatedUser) -> Result<Response> {
    if let Err(forbidden_response) = ensure_user_has_role(&authenticated_user, &[UserRole::Admin]) {
        return Ok(forbidden_response.into_response());
    }

    let response_body = RoleProtectedResponse {
        message: String::from("Welcome to the HireTrack Admin area."),
        area_name: String::from("Admin Portal"),
        user_email: authenticated_user.user_email,
        user_role: authenticated_user.user_role.as_str().to_string(),
    };

    Ok((StatusCode::OK, Json(response_body)).into_response())
}

/// GET /api/protected/recruiter — Accessible only to users with the `recruiter` role.
pub async fn recruiter_area(authenticated_user: AuthenticatedUser) -> Result<Response> {
    if let Err(forbidden_response) =
        ensure_user_has_role(&authenticated_user, &[UserRole::Recruiter])
    {
        return Ok(forbidden_response.into_response());
    }

    let response_body = RoleProtectedResponse {
        message: String::from("Welcome to the HireTrack Recruiter area."),
        area_name: String::from("Recruiter Workspace"),
        user_email: authenticated_user.user_email,
        user_role: authenticated_user.user_role.as_str().to_string(),
    };

    Ok((StatusCode::OK, Json(response_body)).into_response())
}

/// GET /api/protected/candidate — Accessible only to users with the `candidate` role.
pub async fn candidate_area(authenticated_user: AuthenticatedUser) -> Result<Response> {
    if let Err(forbidden_response) =
        ensure_user_has_role(&authenticated_user, &[UserRole::Candidate])
    {
        return Ok(forbidden_response.into_response());
    }

    let response_body = RoleProtectedResponse {
        message: String::from("Welcome to the HireTrack Candidate area."),
        area_name: String::from("Candidate Portal"),
        user_email: authenticated_user.user_email,
        user_role: authenticated_user.user_role.as_str().to_string(),
    };

    Ok((StatusCode::OK, Json(response_body)).into_response())
}

/// Registers role-protected routes under /api/protected.
pub fn routes() -> Routes {
    Routes::new()
        .prefix("api/protected")
        .add("/admin", get(admin_area))
        .add("/recruiter", get(recruiter_area))
        .add("/candidate", get(candidate_area))
}
