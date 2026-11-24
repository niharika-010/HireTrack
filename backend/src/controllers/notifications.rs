use axum::{
    extract::{Path, Query},
    http::StatusCode,
    Json,
};
use loco_rs::prelude::*;
use serde::Serialize;

use crate::{
    middleware::auth::AuthenticatedUser,
    services::notification_service::{
        list_user_notifications, mark_all_notifications_as_read, mark_notification_as_read,
        NotificationListFilters, NotificationResponse, NotificationServiceError,
    },
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SingleNotificationPayload {
    message: String,
    notification: NotificationResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MarkAllReadPayload {
    message: String,
    updated_count: usize,
}

#[derive(Debug, Serialize)]
struct NotificationErrorBody {
    error: String,
}

fn build_notification_error(error: NotificationServiceError) -> Response {
    let (status_code, message) = match error {
        NotificationServiceError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg),
        NotificationServiceError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
        NotificationServiceError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
    };

    (status_code, Json(NotificationErrorBody { error: message })).into_response()
}

/// GET /api/notifications — Lists notifications and unread count for the logged-in user.
pub async fn list_notifications_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Query(filters): Query<NotificationListFilters>,
) -> Result<Response> {
    match list_user_notifications(&ctx, &authenticated_user, filters).await {
        Ok(payload) => Ok((StatusCode::OK, Json(payload)).into_response()),
        Err(error) => Ok(build_notification_error(error)),
    }
}

/// PATCH /api/notifications/{id}/read — Marks one notification belonging to the user as read.
pub async fn mark_read_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Path(notification_id): Path<i32>,
) -> Result<Response> {
    match mark_notification_as_read(&ctx, &authenticated_user, notification_id).await {
        Ok(notification) => Ok((
            StatusCode::OK,
            Json(SingleNotificationPayload {
                message: String::from("Notification marked as read."),
                notification,
            }),
        )
            .into_response()),
        Err(error) => Ok(build_notification_error(error)),
    }
}

/// PATCH /api/notifications/read-all — Marks all unread notifications for the user as read.
pub async fn mark_all_read_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
) -> Result<Response> {
    match mark_all_notifications_as_read(&ctx, &authenticated_user).await {
        Ok(updated_count) => Ok((
            StatusCode::OK,
            Json(MarkAllReadPayload {
                message: String::from("All notifications marked as read."),
                updated_count,
            }),
        )
            .into_response()),
        Err(error) => Ok(build_notification_error(error)),
    }
}

/// Registers notification routes under /api/notifications.
pub fn routes() -> Routes {
    Routes::new()
        .prefix("api/notifications")
        .add("/", get(list_notifications_handler))
        .add("/read-all", patch(mark_all_read_handler))
        .add("/{id}/read", patch(mark_read_handler))
}
