use sea_orm_migration::prelude::*;

/// Standalone entry point for running SeaORM database migrations via CLI.
#[tokio::main]
async fn main() {
    cli::run_cli(migration::Migrator).await;
}
