use sea_orm::entity::prelude::*;

pub use super::_entities::recruiters::{ActiveModel, Column, Entity, Model};

#[async_trait::async_trait]
impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Finds the recruiter profile associated with a specific user ID.
    pub async fn find_by_user_id(
        database: &DatabaseConnection,
        user_id: i32,
    ) -> Result<Option<Self>, DbErr> {
        Entity::find()
            .filter(Column::UserId.eq(user_id))
            .one(database)
            .await
    }
}
