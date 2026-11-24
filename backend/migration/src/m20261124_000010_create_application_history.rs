use sea_orm_migration::prelude::*;

use crate::m20261124_000001_create_users::Users;
use crate::m20261124_000005_create_applications::Applications;

/// Migration 10: Creates `application_status_history` to record every application lifecycle change.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(ApplicationStatusHistory::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ApplicationStatusHistory::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ApplicationStatusHistory::ApplicationId)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ApplicationStatusHistory::PreviousStatus)
                            .string()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ApplicationStatusHistory::NewStatus)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ApplicationStatusHistory::ChangedByUserId)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ApplicationStatusHistory::StatusNote)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ApplicationStatusHistory::ChangedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_app_history_application_id")
                            .from(
                                ApplicationStatusHistory::Table,
                                ApplicationStatusHistory::ApplicationId,
                            )
                            .to(Applications::Table, Applications::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_app_history_changed_by_user_id")
                            .from(
                                ApplicationStatusHistory::Table,
                                ApplicationStatusHistory::ChangedByUserId,
                            )
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
                    .table(ApplicationStatusHistory::Table)
                    .if_exists()
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
pub enum ApplicationStatusHistory {
    Table,
    Id,
    ApplicationId,
    PreviousStatus,
    NewStatus,
    ChangedByUserId,
    StatusNote,
    ChangedAt,
}
