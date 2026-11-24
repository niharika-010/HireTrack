use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// SeaORM entity mapping to the `candidates` table in PostgreSQL (including resume metadata).
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "candidates")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub user_id: i32,
    pub phone_number: Option<String>,
    pub resume_url: Option<String>,
    pub resume_file_name: Option<String>,
    pub resume_mime_type: Option<String>,
    pub resume_file_size_bytes: Option<i32>,
    pub resume_uploaded_at: Option<DateTimeWithTimeZone>,
    pub current_location: Option<String>,
    pub years_of_experience: i32,
    #[sea_orm(column_type = "Text", nullable)]
    pub skills_summary: Option<String>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::users::Entity",
        from = "Column::UserId",
        to = "super::users::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    Users,
    #[sea_orm(has_many = "super::applications::Entity")]
    Applications,
}

impl Related<super::users::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Users.def()
    }
}

impl Related<super::applications::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Applications.def()
    }
}
