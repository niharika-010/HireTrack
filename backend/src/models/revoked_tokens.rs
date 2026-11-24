use chrono::{DateTime, FixedOffset};
use sea_orm::entity::prelude::*;
use sea_orm::Set;

pub use super::_entities::revoked_tokens::{ActiveModel, Column, Entity, Model};

#[async_trait::async_trait]
impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Checks whether a JWT ID (`jti`) has already been revoked by logout.
    pub async fn is_token_revoked(
        database: &DatabaseConnection,
        token_id: &str,
    ) -> Result<bool, DbErr> {
        let found_record = Entity::find()
            .filter(Column::TokenId.eq(token_id))
            .one(database)
            .await?;

        Ok(found_record.is_some())
    }

    /// Inserts a JWT ID (`jti`) into `revoked_tokens` so it cannot be reused after logout.
    pub async fn revoke_token(
        database: &DatabaseConnection,
        token_id: String,
        user_id: i32,
        expires_at: DateTime<FixedOffset>,
    ) -> Result<(), DbErr> {
        // Avoid throwing a duplicate error if logout is called twice with the same token.
        if Self::is_token_revoked(database, &token_id).await? {
            return Ok(());
        }

        let revoked_record = ActiveModel {
            token_id: Set(token_id),
            user_id: Set(user_id),
            expires_at: Set(expires_at),
            ..Default::default()
        };

        revoked_record.insert(database).await?;
        Ok(())
    }
}
