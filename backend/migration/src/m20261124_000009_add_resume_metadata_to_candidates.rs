use sea_orm_migration::prelude::*;

/// Migration 9: Adds resume file metadata columns to the `candidates` table.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Candidates::Table)
                    .add_column_if_not_exists(
                        ColumnDef::new(Candidates::ResumeFileName).string().null(),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(Candidates::ResumeMimeType).string().null(),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(Candidates::ResumeFileSizeBytes)
                            .integer()
                            .null(),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(Candidates::ResumeUploadedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Candidates::Table)
                    .drop_column(Candidates::ResumeUploadedAt)
                    .drop_column(Candidates::ResumeFileSizeBytes)
                    .drop_column(Candidates::ResumeMimeType)
                    .drop_column(Candidates::ResumeFileName)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Candidates {
    Table,
    ResumeFileName,
    ResumeMimeType,
    ResumeFileSizeBytes,
    ResumeUploadedAt,
}
