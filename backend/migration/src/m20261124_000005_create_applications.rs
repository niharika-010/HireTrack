use sea_orm_migration::prelude::*;

use crate::m20261124_000002_create_candidates::Candidates;
use crate::m20261124_000004_create_jobs::Jobs;

/// Migration 5: Creates the `applications` table linking candidates to jobs,
/// with a composite unique index preventing duplicate applications by the same candidate for the same job.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Applications::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Applications::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Applications::CandidateId).integer().not_null())
                    .col(ColumnDef::new(Applications::JobId).integer().not_null())
                    .col(
                        ColumnDef::new(Applications::ApplicationStatus)
                            .string()
                            .not_null()
                            .default("applied"),
                    )
                    .col(ColumnDef::new(Applications::CoverLetter).text().null())
                    .col(ColumnDef::new(Applications::ResumeSnapshotUrl).string().null())
                    .col(
                        ColumnDef::new(Applications::AppliedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Applications::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Applications::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_applications_candidate_id")
                            .from(Applications::Table, Applications::CandidateId)
                            .to(Candidates::Table, Candidates::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_applications_job_id")
                            .from(Applications::Table, Applications::JobId)
                            .to(Jobs::Table, Jobs::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Enforce that a candidate can apply to a given job at most once.
        manager
            .create_index(
                Index::create()
                    .name("idx_applications_candidate_job_unique")
                    .table(Applications::Table)
                    .col(Applications::CandidateId)
                    .col(Applications::JobId)
                    .unique()
                    .if_not_exists()
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("idx_applications_candidate_job_unique")
                    .table(Applications::Table)
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .table(Applications::Table)
                    .if_exists()
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
pub enum Applications {
    Table,
    Id,
    CandidateId,
    JobId,
    ApplicationStatus,
    CoverLetter,
    ResumeSnapshotUrl,
    AppliedAt,
    CreatedAt,
    UpdatedAt,
}
