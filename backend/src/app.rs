use std::path::Path;

use async_trait::async_trait;
use loco_rs::{
    app::{AppContext, Hooks, Initializer},
    bgworker::Queue,
    boot::{create_app, BootResult, StartMode},
    config::Config,
    controller::AppRoutes,
    db,
    environment::Environment,
    task::Tasks,
    Result,
};
use migration::Migrator;

use crate::{controllers, models::_entities};

/// Core Loco.rs application type that wires routes, workers, tasks, and database hooks.
pub struct App;

#[async_trait]
impl Hooks for App {
    fn app_name() -> &'static str {
        env!("CARGO_CRATE_NAME")
    }

    fn app_version() -> String {
        format!(
            "{} ({})",
            env!("CARGO_PKG_VERSION"),
            option_env!("BUILD_SHA")
                .or(option_env!("GITHUB_SHA"))
                .unwrap_or("dev")
        )
    }

    async fn boot(
        mode: StartMode,
        environment: &Environment,
        config: Config,
    ) -> Result<BootResult> {
        create_app::<Self, Migrator>(mode, environment, config).await
    }

    async fn initializers(_ctx: &AppContext) -> Result<Vec<Box<dyn Initializer>>> {
        Ok(vec![])
    }

    fn routes(_ctx: &AppContext) -> AppRoutes {
        AppRoutes::with_default_routes()
            .add_route(controllers::health::routes())
            .add_route(controllers::auth::routes())
            .add_route(controllers::jobs::routes())
            .add_route(controllers::candidates::routes())
            .add_route(controllers::applications::routes())
            .add_route(controllers::interviews::routes())
            .add_route(controllers::dashboard::routes())
            .add_route(controllers::notifications::routes())
            .add_route(controllers::protected::routes())
    }

    async fn connect_workers(_ctx: &AppContext, _queue: &Queue) -> Result<()> {
        // Background job workers will be registered here in future phases.
        Ok(())
    }

    fn register_tasks(_tasks: &mut Tasks) {
        // Custom CLI tasks will be registered here in future phases.
    }

    async fn truncate(ctx: &AppContext) -> Result<()> {
        // Truncate child tables before parent tables to respect foreign key constraints.
        db::truncate_table(&ctx.db, _entities::application_status_history::Entity).await?;
        db::truncate_table(&ctx.db, _entities::revoked_tokens::Entity).await?;
        db::truncate_table(&ctx.db, _entities::notifications::Entity).await?;
        db::truncate_table(&ctx.db, _entities::interviews::Entity).await?;
        db::truncate_table(&ctx.db, _entities::applications::Entity).await?;
        db::truncate_table(&ctx.db, _entities::jobs::Entity).await?;
        db::truncate_table(&ctx.db, _entities::recruiters::Entity).await?;
        db::truncate_table(&ctx.db, _entities::candidates::Entity).await?;
        db::truncate_table(&ctx.db, _entities::users::Entity).await?;
        Ok(())
    }

    async fn seed(_ctx: &AppContext, _base: &Path) -> Result<()> {
        // Sample seed data loading will be added in future phases.
        Ok(())
    }
}
