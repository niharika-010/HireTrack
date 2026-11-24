use sea_orm_migration::prelude::*;

use crate::m20261124_000001_create_users::Users;

/// Migration 3: Creates the `recruiters` profile table linked one-to-one with `users`.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Recruiters::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Recruiters::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Recruiters::UserId)
                            .integer()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Recruiters::CompanyName).string().not_null())
                    .col(ColumnDef::new(Recruiters::Department).string().null())
                    .col(ColumnDef::new(Recruiters::JobTitle).string().null())
                    .col(ColumnDef::new(Recruiters::PhoneNumber).string().null())
                    .col(
                        ColumnDef::new(Recruiters::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Recruiters::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_recruiters_user_id")
                            .from(Recruiters::Table, Recruiters::UserId)
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
            .drop_table(Table::drop().table(Recruiters::Table).if_exists().to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum Recruiters {
    Table,
    Id,
    UserId,
    CompanyName,
    Department,
    JobTitle,
    PhoneNumber,
    CreatedAt,
    UpdatedAt,
}
