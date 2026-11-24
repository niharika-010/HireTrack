use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// SeaORM entity mapping to the `application_status_history` table in PostgreSQL.
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "application_status_history")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub application_id: i32,
    pub previous_status: Option<String>,
    pub new_status: String,
    pub changed_by_user_id: i32,
    #[sea_orm(column_type = "Text", nullable)]
    pub status_note: Option<String>,
    pub changed_at: DateTimeWithTimeZone,
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
        belongs_to = "super::users::Entity",
        from = "Column::ChangedByUserId",
        to = "super::users::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    Users,
}

impl Related<super::applications::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Applications.def()
    }
}

impl Related<super::users::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Users.def()
    }
}
