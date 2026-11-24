pub use sea_orm_migration::prelude::*;

mod m20261124_000001_create_users;
mod m20261124_000002_create_candidates;
mod m20261124_000003_create_recruiters;
mod m20261124_000004_create_jobs;
mod m20261124_000005_create_applications;
mod m20261124_000006_create_interviews;
mod m20261124_000007_create_notifications;
mod m20261124_000008_create_revoked_tokens;
mod m20261124_000009_add_resume_metadata_to_candidates;
mod m20261124_000010_create_application_history;
mod m20261124_000011_add_interview_details_and_feedback;

/// Central migration registry for the HireTrack PostgreSQL database.
/// Migrations are ordered so parent tables are created before child tables with foreign keys.
pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20261124_000001_create_users::Migration),
            Box::new(m20261124_000002_create_candidates::Migration),
            Box::new(m20261124_000003_create_recruiters::Migration),
            Box::new(m20261124_000004_create_jobs::Migration),
            Box::new(m20261124_000005_create_applications::Migration),
            Box::new(m20261124_000006_create_interviews::Migration),
            Box::new(m20261124_000007_create_notifications::Migration),
            Box::new(m20261124_000008_create_revoked_tokens::Migration),
            Box::new(m20261124_000009_add_resume_metadata_to_candidates::Migration),
            Box::new(m20261124_000010_create_application_history::Migration),
            Box::new(m20261124_000011_add_interview_details_and_feedback::Migration),
        ]
    }
}
