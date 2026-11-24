use chrono::Utc;
use loco_rs::app::AppContext;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
};
use serde::{Deserialize, Serialize};

use crate::{middleware::auth::AuthenticatedUser, models::notifications};

/// Clean JSON representation of a notification returned to the frontend.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationResponse {
    pub notification_id: i32,
    pub notification_type: String,
    pub title: String,
    pub message: String,
    pub is_read: bool,
    pub read_at: Option<String>,
    pub created_at: String,
}

/// Summary wrapper containing notifications along with total and unread counts.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationListResponse {
    pub notifications: Vec<NotificationResponse>,
    pub total_count: usize,
    pub unread_count: usize,
}

/// Optional query filter for listing notifications.
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationListFilters {
    pub unread_only: Option<bool>,
}

/// Domain errors returned by notification operations.
#[derive(Debug)]
pub enum NotificationServiceError {
    Forbidden(String),
    NotFound(String),
    Internal(String),
}

fn map_notification(record: notifications::Model) -> NotificationResponse {
    NotificationResponse {
        notification_id: record.id,
        notification_type: record.notification_type,
        title: record.title,
        message: record.message,
        is_read: record.is_read,
        read_at: record.read_at.map(|timestamp| timestamp.to_rfc3339()),
        created_at: record.created_at.to_rfc3339(),
    }
}

/// Creates and persists a new notification record for a target user in PostgreSQL.
/// Called automatically whenever key recruitment events occur (new application, status change, interview scheduled/evaluated).
pub async fn create_notification(
    database: &DatabaseConnection,
    recipient_user_id: i32,
    notification_type: &str,
    title: impl Into<String>,
    message: impl Into<String>,
) -> Result<NotificationResponse, NotificationServiceError> {
    let new_notification = notifications::ActiveModel {
        user_id: Set(recipient_user_id),
        notification_type: Set(notification_type.to_string()),
        title: Set(title.into()),
        message: Set(message.into()),
        is_read: Set(false),
        ..Default::default()
    };

    let created = new_notification.insert(database).await.map_err(|error| {
        NotificationServiceError::Internal(format!("Failed to create notification: {error}"))
    })?;

    Ok(map_notification(created))
}

/// Retrieves notifications strictly for the currently logged-in user, newest first,
/// along with the exact unread count calculated from PostgreSQL.
pub async fn list_user_notifications(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    filters: NotificationListFilters,
) -> Result<NotificationListResponse, NotificationServiceError> {
    let all_user_notifications = notifications::Entity::find()
        .filter(notifications::Column::UserId.eq(authenticated_user.user_id))
        .order_by_desc(notifications::Column::CreatedAt)
        .order_by_desc(notifications::Column::Id)
        .all(&ctx.db)
        .await
        .map_err(|error| {
            NotificationServiceError::Internal(format!("Failed to load notifications: {error}"))
        })?;

    let unread_count = all_user_notifications
        .iter()
        .filter(|item| !item.is_read)
        .count();

    let unread_only = filters.unread_only.unwrap_or(false);
    let filtered_items: Vec<NotificationResponse> = all_user_notifications
        .into_iter()
        .filter(|item| !unread_only || !item.is_read)
        .map(map_notification)
        .collect();

    let total_count = filtered_items.len();

    Ok(NotificationListResponse {
        notifications: filtered_items,
        total_count,
        unread_count,
    })
}

/// Marks a single notification as read after confirming ownership.
pub async fn mark_notification_as_read(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    notification_id: i32,
) -> Result<NotificationResponse, NotificationServiceError> {
    let existing = notifications::Entity::find_by_id(notification_id)
        .one(&ctx.db)
        .await
        .map_err(|error| {
            NotificationServiceError::Internal(format!("Failed to load notification: {error}"))
        })?
        .ok_or_else(|| {
            NotificationServiceError::NotFound(String::from("Notification was not found."))
        })?;

    // Enforce strict user ownership so users can never mark another user's notification read.
    if existing.user_id != authenticated_user.user_id {
        return Err(NotificationServiceError::Forbidden(String::from(
            "You do not have permission to update this notification.",
        )));
    }

    if existing.is_read {
        return Ok(map_notification(existing));
    }

    let now_timestamp = Utc::now().fixed_offset();
    let mut active_record: notifications::ActiveModel = existing.into();
    active_record.is_read = Set(true);
    active_record.read_at = Set(Some(now_timestamp));
    active_record.updated_at = Set(now_timestamp);

    let updated = active_record.update(&ctx.db).await.map_err(|error| {
        NotificationServiceError::Internal(format!("Failed to mark notification read: {error}"))
    })?;

    Ok(map_notification(updated))
}

/// Marks every unread notification for the logged-in user as read and returns how many were updated.
pub async fn mark_all_notifications_as_read(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
) -> Result<usize, NotificationServiceError> {
    let unread_records =
        notifications::Model::list_unread_for_user(&ctx.db, authenticated_user.user_id)
            .await
            .map_err(|error| {
                NotificationServiceError::Internal(format!(
                    "Failed to load unread notifications: {error}"
                ))
            })?;

    let updated_count = unread_records.len();
    let now_timestamp = Utc::now().fixed_offset();

    for record in unread_records {
        let mut active_record: notifications::ActiveModel = record.into();
        active_record.is_read = Set(true);
        active_record.read_at = Set(Some(now_timestamp));
        active_record.updated_at = Set(now_timestamp);
        active_record.update(&ctx.db).await.map_err(|error| {
            NotificationServiceError::Internal(format!(
                "Failed to update notification read status: {error}"
            ))
        })?;
    }

    Ok(updated_count)
}
