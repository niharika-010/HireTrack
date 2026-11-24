use sea_orm::entity::prelude::*;

pub use super::_entities::users::{ActiveModel, Column, Entity, Model};

#[async_trait::async_trait]
impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Finds a single user record by their unique email address.
    pub async fn find_by_email(
        database: &DatabaseConnection,
        email_address: &str,
    ) -> Result<Option<Self>, DbErr> {
        Entity::find()
            .filter(Column::Email.eq(email_address))
            .one(database)
            .await
    }
}
