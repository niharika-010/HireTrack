use sea_orm_migration::prelude::*;

use crate::m20261124_000001_create_users::Users;

/// Migration 8: Creates the `revoked_tokens` table to invalidate logged-out JWTs server-side.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(RevokedTokens::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(RevokedTokens::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(RevokedTokens::TokenId)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(RevokedTokens::UserId).integer().not_null())
                    .col(
                        ColumnDef::new(RevokedTokens::ExpiresAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(RevokedTokens::RevokedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_revoked_tokens_user_id")
                            .from(RevokedTokens::Table, RevokedTokens::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table(RevokedTokens::Table)
                    .if_exists()
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
pub enum RevokedTokens {
    Table,
    Id,
    TokenId,
    UserId,
    ExpiresAt,
    RevokedAt,
}
