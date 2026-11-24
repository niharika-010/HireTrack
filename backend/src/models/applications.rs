use sea_orm::entity::prelude::*;

pub use super::_entities::applications::{ActiveModel, Column, Entity, Model};

#[async_trait::async_trait]
impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Checks whether a candidate has already submitted an application for a specific job.
    /// Complements the database-level unique index on `(candidate_id, job_id)`.
    pub async fn exists_for_candidate_and_job(
        database: &DatabaseConnection,
        candidate_id: i32,
        job_id: i32,
    ) -> Result<bool, DbErr> {
        let existing_application = Entity::find()
            .filter(Column::CandidateId.eq(candidate_id))
            .filter(Column::JobId.eq(job_id))
            .one(database)
            .await?;

        Ok(existing_application.is_some())
    }
}
