use sea_orm::entity::prelude::*;

pub use super::_entities::jobs::{ActiveModel, Column, Entity, Model};

#[async_trait::async_trait]
impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Lists all job openings posted by a given recruiter.
    pub async fn list_by_recruiter(
        database: &DatabaseConnection,
        recruiter_id: i32,
    ) -> Result<Vec<Self>, DbErr> {
        Entity::find()
            .filter(Column::RecruiterId.eq(recruiter_id))
            .all(database)
            .await
    }
}
