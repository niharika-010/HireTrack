use sea_orm_migration::prelude::*;

/// Migration 11: Extends the `interviews` table with interviewer details, round type (technical/hr),
/// structured interview feedback, rating, and evaluation result columns.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Interviews::Table)
                    .add_column_if_not_exists(
                        ColumnDef::new(Interviews::InterviewerName)
                            .string()
                            .not_null()
                            .default("Hiring Panel"),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(Interviews::InterviewerEmail).string().null(),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(Interviews::InterviewRound)
                            .string()
                            .not_null()
                            .default("technical"),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(Interviews::InterviewFeedback).text().null(),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(Interviews::InterviewRating).integer().null(),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(Interviews::InterviewResult)
                            .string()
                            .not_null()
                            .default("pending"),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(Interviews::FeedbackSubmittedAt)
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
                    .table(Interviews::Table)
                    .drop_column(Interviews::FeedbackSubmittedAt)
                    .drop_column(Interviews::InterviewResult)
                    .drop_column(Interviews::InterviewRating)
                    .drop_column(Interviews::InterviewFeedback)
                    .drop_column(Interviews::InterviewRound)
                    .drop_column(Interviews::InterviewerEmail)
                    .drop_column(Interviews::InterviewerName)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Interviews {
    Table,
    InterviewerName,
    InterviewerEmail,
    InterviewRound,
    InterviewFeedback,
    InterviewRating,
    InterviewResult,
    FeedbackSubmittedAt,
}
