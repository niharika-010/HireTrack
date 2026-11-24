use axum::{http::StatusCode, Json};
use loco_rs::prelude::*;
use serde::{Deserialize, Serialize};

use crate::{
    middleware::auth::AuthenticatedUser,
    services::auth_service::{
        login_user, register_user, revoke_user_token, AuthServiceError, LoginInput,
        PublicUserProfile, RegistrationInput,
    },
};

/// Request payload accepted by POST /api/auth/register.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterRequestPayload {
    pub full_name: String,
    pub user_email: String,
    pub user_password: String,
    pub user_role: String,
    pub company_name: Option<String>,
}

/// Request payload accepted by POST /api/auth/login.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequestPayload {
    pub user_email: String,
    pub user_password: String,
}

/// Response payload returned after a successful registration or login.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthSuccessResponse {
    pub message: String,
    pub token: String,
    pub user: PublicUserProfile,
}

/// Response payload returned by GET /api/auth/me.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrentUserResponse {
    pub user: PublicUserProfile,
}

/// Simple JSON message payload returned by POST /api/auth/logout.
#[derive(Debug, Serialize)]
pub struct LogoutResponse {
    pub message: String,
}

/// Consistent JSON error payload for auth controller failures.
#[derive(Debug, Serialize)]
struct ErrorResponseBody {
    error: String,
}

/// Maps domain authentication errors into clear HTTP status codes and JSON messages.
fn build_error_response(error: AuthServiceError) -> Response {
    let (status_code, error_message) = match error {
        AuthServiceError::Validation(message) => (StatusCode::BAD_REQUEST, message),
        AuthServiceError::DuplicateEmail(message) => (StatusCode::CONFLICT, message),
        AuthServiceError::InvalidCredentials(message) => (StatusCode::UNAUTHORIZED, message),
        AuthServiceError::Unauthorized(message) => (StatusCode::UNAUTHORIZED, message),
        AuthServiceError::Internal(message) => (StatusCode::INTERNAL_SERVER_ERROR, message),
    };

    (
        status_code,
        Json(ErrorResponseBody {
            error: error_message,
        }),
    )
        .into_response()
}

/// POST /api/auth/register — Registers a new user account and returns a signed JWT.
pub async fn register(
    State(ctx): State<AppContext>,
    Json(payload): Json<RegisterRequestPayload>,
) -> Result<Response> {
    let registration_input = RegistrationInput {
        full_name: payload.full_name,
        user_email: payload.user_email,
        user_password: payload.user_password,
        user_role: payload.user_role,
        company_name: payload.company_name,
    };

    match register_user(&ctx, registration_input).await {
        Ok((user_profile, auth_token)) => {
            let response_body = AuthSuccessResponse {
                message: String::from("Account registered successfully."),
                token: auth_token,
                user: user_profile,
            };
            Ok((StatusCode::CREATED, Json(response_body)).into_response())
        }
        Err(service_error) => Ok(build_error_response(service_error)),
    }
}

/// POST /api/auth/login — Validates user credentials and returns a signed JWT.
pub async fn login(
    State(ctx): State<AppContext>,
    Json(payload): Json<LoginRequestPayload>,
) -> Result<Response> {
    let login_input = LoginInput {
        user_email: payload.user_email,
        user_password: payload.user_password,
    };

    match login_user(&ctx, login_input).await {
        Ok((user_profile, auth_token)) => {
            let response_body = AuthSuccessResponse {
                message: String::from("Logged in successfully."),
                token: auth_token,
                user: user_profile,
            };
            Ok((StatusCode::OK, Json(response_body)).into_response())
        }
        Err(service_error) => Ok(build_error_response(service_error)),
    }
}

/// GET /api/auth/me — Returns the profile of the currently authenticated user.
pub async fn current_user(authenticated_user: AuthenticatedUser) -> Result<Response> {
    let response_body = CurrentUserResponse {
        user: authenticated_user.to_public_profile(),
    };

    Ok((StatusCode::OK, Json(response_body)).into_response())
}

/// POST /api/auth/logout — Revokes the caller's JWT in PostgreSQL so it cannot be reused.
pub async fn logout(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
) -> Result<Response> {
    match revoke_user_token(
        &ctx,
        authenticated_user.token_id,
        authenticated_user.user_id,
        authenticated_user.token_expires_at,
    )
    .await
    {
        Ok(()) => {
            let response_body = LogoutResponse {
                message: String::from("Logged out successfully. Your token has been invalidated."),
            };
            Ok((StatusCode::OK, Json(response_body)).into_response())
        }
        Err(service_error) => Ok(build_error_response(service_error)),
    }
}

/// Registers all authentication endpoints under /api/auth.
pub fn routes() -> Routes {
    Routes::new()
        .prefix("api/auth")
        .add("/register", post(register))
        .add("/login", post(login))
        .add("/me", get(current_user))
        .add("/logout", post(logout))
}
