use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// SeaORM entity mapping to the `applications` table in PostgreSQL.
/// Duplicate applications for the same `(candidate_id, job_id)` pair are blocked by a unique index.
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "applications")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub candidate_id: i32,
    pub job_id: i32,
    pub application_status: String,
    #[sea_orm(column_type = "Text", nullable)]
    pub cover_letter: Option<String>,
    pub resume_snapshot_url: Option<String>,
    pub applied_at: DateTimeWithTimeZone,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::candidates::Entity",
        from = "Column::CandidateId",
        to = "super::candidates::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    Candidates,
    #[sea_orm(
        belongs_to = "super::jobs::Entity",
        from = "Column::JobId",
        to = "super::jobs::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    Jobs,
    #[sea_orm(has_many = "super::interviews::Entity")]
    Interviews,
}

impl Related<super::candidates::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Candidates.def()
    }
}

impl Related<super::jobs::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Jobs.def()
    }
}

impl Related<super::interviews::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Interviews.def()
    }
}
