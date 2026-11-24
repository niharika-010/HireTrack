use sea_orm::entity::prelude::*;

pub use super::_entities::interviews::{ActiveModel, Column, Entity, Model};

#[async_trait::async_trait]
impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Lists all scheduled or past interviews linked to a specific job application.
    pub async fn list_for_application(
        database: &DatabaseConnection,
        application_id: i32,
    ) -> Result<Vec<Self>, DbErr> {
        Entity::find()
            .filter(Column::ApplicationId.eq(application_id))
            .all(database)
            .await
    }
}
