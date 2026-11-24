use sea_orm::entity::prelude::*;

pub use super::_entities::notifications::{ActiveModel, Column, Entity, Model};

#[async_trait::async_trait]
impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Returns all unread notifications belonging to a specific user.
    pub async fn list_unread_for_user(
        database: &DatabaseConnection,
        user_id: i32,
    ) -> Result<Vec<Self>, DbErr> {
        Entity::find()
            .filter(Column::UserId.eq(user_id))
            .filter(Column::IsRead.eq(false))
            .all(database)
            .await
    }
}
