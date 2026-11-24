use sea_orm_migration::prelude::*;

use crate::m20261124_000001_create_users::Users;

/// Migration 2: Creates the `candidates` profile table linked one-to-one with `users`.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Candidates::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Candidates::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Candidates::UserId)
                            .integer()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Candidates::PhoneNumber).string().null())
                    .col(ColumnDef::new(Candidates::ResumeUrl).string().null())
                    .col(ColumnDef::new(Candidates::CurrentLocation).string().null())
                    .col(
                        ColumnDef::new(Candidates::YearsOfExperience)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(ColumnDef::new(Candidates::SkillsSummary).text().null())
                    .col(
                        ColumnDef::new(Candidates::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Candidates::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_candidates_user_id")
                            .from(Candidates::Table, Candidates::UserId)
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
            .drop_table(Table::drop().table(Candidates::Table).if_exists().to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum Candidates {
    Table,
    Id,
    UserId,
    PhoneNumber,
    ResumeUrl,
    CurrentLocation,
    YearsOfExperience,
    SkillsSummary,
    CreatedAt,
    UpdatedAt,
}
