use axum::{http::StatusCode, Json};
use loco_rs::prelude::*;
use serde::Serialize;

use crate::models;

/// JSON payload returned by the health-check endpoint.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthStatusResponse {
    pub status: String,
    pub service_name: String,
    pub database_status: String,
}

/// Handles GET /api/health by verifying both the HTTP server and PostgreSQL connectivity.
pub async fn check_health(State(ctx): State<AppContext>) -> Result<Response> {
    let database_check_result = models::verify_database_connection(&ctx.db).await;

    match database_check_result {
        Ok(()) => {
            let healthy_response = HealthStatusResponse {
                status: String::from("ok"),
                service_name: String::from("HireTrack Backend API"),
                database_status: String::from("connected"),
            };

            Ok((StatusCode::OK, Json(healthy_response)).into_response())
        }
        Err(_) => {
            let degraded_response = HealthStatusResponse {
                status: String::from("degraded"),
                service_name: String::from("HireTrack Backend API"),
                database_status: String::from("disconnected"),
            };

            Ok((StatusCode::SERVICE_UNAVAILABLE, Json(degraded_response)).into_response())
        }
    }
}

/// Registers routes belonging to the health controller.
pub fn routes() -> Routes {
    Routes::new()
        .prefix("api/health")
        .add("/", get(check_health))
}
