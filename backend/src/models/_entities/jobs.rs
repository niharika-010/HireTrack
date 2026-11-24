use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// SeaORM entity mapping to the `jobs` table in PostgreSQL.
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "jobs")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub recruiter_id: i32,
    pub job_title: String,
    pub department: String,
    pub location: String,
    pub employment_type: String,
    pub salary_min: Option<i32>,
    pub salary_max: Option<i32>,
    #[sea_orm(column_type = "Text")]
    pub description: String,
    #[sea_orm(column_type = "Text", nullable)]
    pub requirements: Option<String>,
    pub job_status: String,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::recruiters::Entity",
        from = "Column::RecruiterId",
        to = "super::recruiters::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    Recruiters,
    #[sea_orm(has_many = "super::applications::Entity")]
    Applications,
}

impl Related<super::recruiters::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Recruiters.def()
    }
}

impl Related<super::applications::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Applications.def()
    }
}
