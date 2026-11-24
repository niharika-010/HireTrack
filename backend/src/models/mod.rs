use sea_orm::{DatabaseConnection, DbErr};

pub mod _entities;
pub mod application_status_history;
pub mod applications;
pub mod candidates;
pub mod interviews;
pub mod jobs;
pub mod notifications;
pub mod recruiters;
pub mod revoked_tokens;
pub mod users;

/// Verifies that the PostgreSQL connection pool is alive by sending a lightweight ping.
pub async fn verify_database_connection(database: &DatabaseConnection) -> Result<(), DbErr> {
    database.ping().await
}
