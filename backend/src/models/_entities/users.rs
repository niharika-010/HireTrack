use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// SeaORM entity mapping to the `users` table in PostgreSQL.
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub full_name: String,
    #[sea_orm(unique)]
    pub email: String,
    pub password_hash: String,
    pub role: String,
    pub is_active: bool,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_one = "super::candidates::Entity")]
    Candidates,
    #[sea_orm(has_one = "super::recruiters::Entity")]
    Recruiters,
    #[sea_orm(has_many = "super::notifications::Entity")]
    Notifications,
}

impl Related<super::candidates::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Candidates.def()
    }
}

impl Related<super::recruiters::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Recruiters.def()
    }
}

impl Related<super::notifications::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Notifications.def()
    }
}
