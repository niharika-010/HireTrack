use sea_orm_migration::prelude::*;

use crate::m20261124_000003_create_recruiters::Recruiters;
use crate::m20261124_000005_create_applications::Applications;

/// Migration 6: Creates the `interviews` table linked to an application and the scheduling recruiter.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Interviews::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Interviews::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Interviews::ApplicationId).integer().not_null())
                    .col(ColumnDef::new(Interviews::RecruiterId).integer().not_null())
                    .col(
                        ColumnDef::new(Interviews::ScheduledAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Interviews::DurationMinutes)
                            .integer()
                            .not_null()
                            .default(45),
                    )
                    .col(
                        ColumnDef::new(Interviews::InterviewMode)
                            .string()
                            .not_null()
                            .default("video"),
                    )
                    .col(ColumnDef::new(Interviews::MeetingLink).string().null())
                    .col(
                        ColumnDef::new(Interviews::InterviewStatus)
                            .string()
                            .not_null()
                            .default("scheduled"),
                    )
                    .col(ColumnDef::new(Interviews::InterviewerNotes).text().null())
                    .col(
                        ColumnDef::new(Interviews::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Interviews::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_interviews_application_id")
                            .from(Interviews::Table, Interviews::ApplicationId)
                            .to(Applications::Table, Applications::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_interviews_recruiter_id")
                            .from(Interviews::Table, Interviews::RecruiterId)
                            .to(Recruiters::Table, Recruiters::Id)
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
                    .table(Interviews::Table)
                    .if_exists()
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
pub enum Interviews {
    Table,
    Id,
    ApplicationId,
    RecruiterId,
    ScheduledAt,
    DurationMinutes,
    InterviewMode,
    MeetingLink,
    InterviewStatus,
    InterviewerNotes,
    CreatedAt,
    UpdatedAt,
}
