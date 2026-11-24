use axum::{
    extract::FromRequestParts,
    http::{header::AUTHORIZATION, request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use loco_rs::app::AppContext;
use sea_orm::EntityTrait;
use serde::Serialize;

use crate::{
    models::{revoked_tokens, users},
    services::auth_service::{
        load_jwt_settings, verify_jwt_token, AuthServiceError, PublicUserProfile, UserRole,
    },
};

/// Consistent JSON error payload returned when authentication or authorization fails.
#[derive(Debug, Serialize)]
pub struct AuthErrorBody {
    pub error: String,
}

/// HTTP rejection type returned by `AuthenticatedUser` and role guards.
#[derive(Debug)]
pub struct AuthErrorResponse {
    pub status_code: StatusCode,
    pub message: String,
}

impl AuthErrorResponse {
    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self {
            status_code: StatusCode::UNAUTHORIZED,
            message: message.into(),
        }
    }

    pub fn forbidden(message: impl Into<String>) -> Self {
        Self {
            status_code: StatusCode::FORBIDDEN,
            message: message.into(),
        }
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self {
            status_code: StatusCode::INTERNAL_SERVER_ERROR,
            message: message.into(),
        }
    }
}

impl IntoResponse for AuthErrorResponse {
    fn into_response(self) -> Response {
        (self.status_code, Json(AuthErrorBody { error: self.message })).into_response()
    }
}

/// Authenticated user identity extracted from a valid, non-revoked Bearer JWT.
/// Any controller handler that accepts `AuthenticatedUser` is automatically protected.
#[derive(Clone, Debug)]
pub struct AuthenticatedUser {
    pub user_id: i32,
    pub full_name: String,
    pub user_email: String,
    pub user_role: UserRole,
    pub is_active: bool,
    pub token_id: String,
    pub token_expires_at: i64,
}

impl AuthenticatedUser {
    /// Converts the authenticated user into a safe public profile payload.
    pub fn to_public_profile(&self) -> PublicUserProfile {
        PublicUserProfile {
            user_id: self.user_id,
            full_name: self.full_name.clone(),
            user_email: self.user_email.clone(),
            user_role: self.user_role.as_str().to_string(),
            is_active: self.is_active,
        }
    }
}

/// Extracts the raw Bearer token from the HTTP `Authorization` header.
fn extract_bearer_token(parts: &Parts) -> Result<&str, AuthErrorResponse> {
    let authorization_header = parts
        .headers
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| {
            AuthErrorResponse::unauthorized("Missing Authorization header. Please log in.")
        })?;

    let raw_token = authorization_header
        .strip_prefix("Bearer ")
        .map(str::trim)
        .filter(|token| !token.is_empty())
        .ok_or_else(|| {
            AuthErrorResponse::unauthorized(
                "Authorization header must use the format: Bearer <token>",
            )
        })?;

    Ok(raw_token)
}

impl FromRequestParts<AppContext> for AuthenticatedUser {
    type Rejection = AuthErrorResponse;

    async fn from_request_parts(
        parts: &mut Parts,
        ctx: &AppContext,
    ) -> Result<Self, Self::Rejection> {
        // Step 1: Read the Bearer JWT from the Authorization header.
        let raw_token = extract_bearer_token(parts)?;

        // Step 2: Load the server-side JWT secret and validate signature + expiration.
        let (jwt_secret, _expiration_seconds) = load_jwt_settings(ctx).map_err(|error| match error {
            AuthServiceError::Internal(message) => AuthErrorResponse::internal(message),
            _ => AuthErrorResponse::unauthorized("Authentication failed."),
        })?;

        let token_claims = verify_jwt_token(raw_token, &jwt_secret).map_err(|error| match error {
            AuthServiceError::Unauthorized(message) => AuthErrorResponse::unauthorized(message),
            AuthServiceError::Internal(message) => AuthErrorResponse::internal(message),
            _ => AuthErrorResponse::unauthorized("Invalid authentication token."),
        })?;

        // Step 3: Reject the token if it was invalidated via `/api/auth/logout`.
        let token_is_revoked = revoked_tokens::Model::is_token_revoked(&ctx.db, &token_claims.jti)
            .await
            .map_err(|_| {
                AuthErrorResponse::internal("Failed to verify token revocation status.")
            })?;

        if token_is_revoked {
            return Err(AuthErrorResponse::unauthorized(
                "This session has been logged out. Please log in again.",
            ));
        }

        // Step 4: Load the user from PostgreSQL and confirm the account is still active.
        let user_record = users::Entity::find_by_id(token_claims.sub)
            .one(&ctx.db)
            .await
            .map_err(|_| AuthErrorResponse::internal("Failed to load authenticated user."))?
            .ok_or_else(|| {
                AuthErrorResponse::unauthorized("User account no longer exists.")
            })?;

        if !user_record.is_active {
            return Err(AuthErrorResponse::unauthorized(
                "This user account is inactive.",
            ));
        }

        let parsed_role = UserRole::parse_role(&user_record.role).ok_or_else(|| {
            AuthErrorResponse::forbidden("User has an unrecognized role.")
        })?;

        Ok(Self {
            user_id: user_record.id,
            full_name: user_record.full_name,
            user_email: user_record.email,
            user_role: parsed_role,
            is_active: user_record.is_active,
            token_id: token_claims.jti,
            token_expires_at: token_claims.exp,
        })
    }
}

/// Checks whether the authenticated user holds one of the allowed roles for a protected endpoint.
pub fn ensure_user_has_role(
    authenticated_user: &AuthenticatedUser,
    allowed_roles: &[UserRole],
) -> Result<(), AuthErrorResponse> {
    if allowed_roles.contains(&authenticated_user.user_role) {
        return Ok(());
    }

    let allowed_role_names: Vec<&str> = allowed_roles.iter().map(UserRole::as_str).collect();
    Err(AuthErrorResponse::forbidden(format!(
        "Access denied. Role '{}' is not permitted here (required: {}).",
        authenticated_user.user_role.as_str(),
        allowed_role_names.join(", ")
    )))
}
