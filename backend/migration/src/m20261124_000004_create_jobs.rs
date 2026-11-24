use sea_orm_migration::prelude::*;

use crate::m20261124_000003_create_recruiters::Recruiters;

/// Migration 4: Creates the `jobs` table referencing the recruiter who posted each opening.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Jobs::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Jobs::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Jobs::RecruiterId).integer().not_null())
                    .col(ColumnDef::new(Jobs::JobTitle).string().not_null())
                    .col(ColumnDef::new(Jobs::Department).string().not_null())
                    .col(ColumnDef::new(Jobs::Location).string().not_null())
                    .col(
                        ColumnDef::new(Jobs::EmploymentType)
                            .string()
                            .not_null()
                            .default("full_time"),
                    )
                    .col(ColumnDef::new(Jobs::SalaryMin).integer().null())
                    .col(ColumnDef::new(Jobs::SalaryMax).integer().null())
                    .col(ColumnDef::new(Jobs::Description).text().not_null())
                    .col(ColumnDef::new(Jobs::Requirements).text().null())
                    .col(
                        ColumnDef::new(Jobs::JobStatus)
                            .string()
                            .not_null()
                            .default("open"),
                    )
                    .col(
                        ColumnDef::new(Jobs::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Jobs::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_jobs_recruiter_id")
                            .from(Jobs::Table, Jobs::RecruiterId)
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
            .drop_table(Table::drop().table(Jobs::Table).if_exists().to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum Jobs {
    Table,
    Id,
    RecruiterId,
    JobTitle,
    Department,
    Location,
    EmploymentType,
    SalaryMin,
    SalaryMax,
    Description,
    Requirements,
    JobStatus,
    CreatedAt,
    UpdatedAt,
}
