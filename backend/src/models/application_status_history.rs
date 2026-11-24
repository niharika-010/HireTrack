use sea_orm::{entity::prelude::*, QueryOrder};

pub use super::_entities::application_status_history::{ActiveModel, Column, Entity, Model};

#[async_trait::async_trait]
impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Returns the full chronological status history for a specific job application.
    pub async fn list_for_application(
        database: &DatabaseConnection,
        application_id: i32,
    ) -> Result<Vec<Self>, DbErr> {
        Entity::find()
            .filter(Column::ApplicationId.eq(application_id))
            .order_by_asc(Column::ChangedAt)
            .order_by_asc(Column::Id)
            .all(database)
            .await
    }
}
