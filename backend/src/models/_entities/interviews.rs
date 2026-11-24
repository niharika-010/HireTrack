use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// SeaORM entity mapping to the `interviews` table in PostgreSQL.
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "interviews")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub application_id: i32,
    pub recruiter_id: i32,
    pub interviewer_name: String,
    pub interviewer_email: Option<String>,
    pub interview_round: String,
    pub scheduled_at: DateTimeWithTimeZone,
    pub duration_minutes: i32,
    pub interview_mode: String,
    pub meeting_link: Option<String>,
    pub interview_status: String,
    #[sea_orm(column_type = "Text", nullable)]
    pub interviewer_notes: Option<String>,
    #[sea_orm(column_type = "Text", nullable)]
    pub interview_feedback: Option<String>,
    pub interview_rating: Option<i32>,
    pub interview_result: String,
    pub feedback_submitted_at: Option<DateTimeWithTimeZone>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::applications::Entity",
        from = "Column::ApplicationId",
        to = "super::applications::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    Applications,
    #[sea_orm(
        belongs_to = "super::recruiters::Entity",
        from = "Column::RecruiterId",
        to = "super::recruiters::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    Recruiters,
}

impl Related<super::applications::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Applications.def()
    }
}

impl Related<super::recruiters::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Recruiters.def()
    }
}
