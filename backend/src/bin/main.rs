use hiretrack_backend::app::App;
use loco_rs::cli;
use migration::Migrator;

/// Main CLI entry point for running Loco.rs commands (start, db migrate, doctor, etc.).
#[tokio::main]
async fn main() -> loco_rs::Result<()> {
    // Load local environment variables from `.env` (if present) before Loco reads YAML config.
    let _ = dotenvy::dotenv();

    cli::main::<App, Migrator>().await
}
