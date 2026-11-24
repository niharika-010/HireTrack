use axum::{
    extract::{Multipart, Path},
    http::{header, StatusCode},
    Json,
};
use loco_rs::prelude::*;
use serde::Serialize;

use crate::{
    middleware::auth::AuthenticatedUser,
    services::{
        candidate_service::{
            get_my_candidate_profile, update_my_candidate_profile, upload_my_resume,
            verify_resume_download_access, CandidateProfileResponse, CandidateServiceError,
            UpdateCandidateProfileInput,
        },
        file_storage_service::{load_stored_resume_bytes, FileStorageError},
    },
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CandidateProfilePayload {
    message: String,
    profile: CandidateProfileResponse,
}

#[derive(Debug, Serialize)]
struct CandidateErrorBody {
    error: String,
}

fn build_candidate_error_response(error: CandidateServiceError) -> Response {
    let (status_code, message) = match error {
        CandidateServiceError::Validation(msg) => (StatusCode::BAD_REQUEST, msg),
        CandidateServiceError::PayloadTooLarge(msg) => (StatusCode::PAYLOAD_TOO_LARGE, msg),
        CandidateServiceError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg),
        CandidateServiceError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
        CandidateServiceError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
    };

    (status_code, Json(CandidateErrorBody { error: message })).into_response()
}

/// GET /api/candidates/me — Loads the authenticated candidate's profile and resume metadata.
pub async fn get_profile_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
) -> Result<Response> {
    match get_my_candidate_profile(&ctx, &authenticated_user).await {
        Ok(profile) => Ok((
            StatusCode::OK,
            Json(CandidateProfilePayload {
                message: String::from("Candidate profile loaded successfully."),
                profile,
            }),
        )
            .into_response()),
        Err(service_error) => Ok(build_candidate_error_response(service_error)),
    }
}

/// PUT /api/candidates/me — Updates the authenticated candidate's profile fields.
pub async fn update_profile_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Json(payload): Json<UpdateCandidateProfileInput>,
) -> Result<Response> {
    match update_my_candidate_profile(&ctx, &authenticated_user, payload).await {
        Ok(profile) => Ok((
            StatusCode::OK,
            Json(CandidateProfilePayload {
                message: String::from("Candidate profile updated successfully."),
                profile,
            }),
        )
            .into_response()),
        Err(service_error) => Ok(build_candidate_error_response(service_error)),
    }
}

/// POST /api/candidates/me/resume — Accepts a multipart PDF/DOCX resume upload, validates it, and stores metadata.
pub async fn upload_resume_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    mut multipart: Multipart,
) -> Result<Response> {
    let mut uploaded_file_name: Option<String> = None;
    let mut uploaded_mime_type: Option<String> = None;
    let mut uploaded_bytes: Option<Vec<u8>> = None;

    while let Some(field) = multipart.next_field().await.map_err(|error| {
        loco_rs::Error::BadRequest(format!("Invalid multipart form upload: {error}"))
    })? {
        if field.name() == Some("resume") {
            uploaded_file_name = field.file_name().map(str::to_string);
            uploaded_mime_type = field.content_type().map(str::to_string);
            let bytes = field.bytes().await.map_err(|error| {
                loco_rs::Error::BadRequest(format!("Failed to read uploaded file: {error}"))
            })?;
            uploaded_bytes = Some(bytes.to_vec());
            break;
        }
    }

    let (file_name, file_bytes) = match (uploaded_file_name, uploaded_bytes) {
        (Some(name), Some(bytes)) => (name, bytes),
        _ => {
            return Ok(build_candidate_error_response(
                CandidateServiceError::Validation(String::from(
                    "Please attach a PDF or DOCX file in the 'resume' form field.",
                )),
            ));
        }
    };

    match upload_my_resume(
        &ctx,
        &authenticated_user,
        &file_name,
        uploaded_mime_type.as_deref(),
        &file_bytes,
    )
    .await
    {
        Ok(profile) => Ok((
            StatusCode::OK,
            Json(CandidateProfilePayload {
                message: String::from("Resume uploaded and saved successfully."),
                profile,
            }),
        )
            .into_response()),
        Err(service_error) => Ok(build_candidate_error_response(service_error)),
    }
}

/// GET /api/candidates/resumes/{file_key} — Serves a stored resume only to the owning candidate,
/// a recruiter reviewing that candidate's application, or an Admin.
pub async fn download_resume_handler(
    State(ctx): State<AppContext>,
    authenticated_user: AuthenticatedUser,
    Path(file_key): Path<String>,
) -> Result<Response> {
    if let Err(access_error) =
        verify_resume_download_access(&ctx, &authenticated_user, &file_key).await
    {
        return Ok(build_candidate_error_response(access_error));
    }

    match load_stored_resume_bytes(&file_key).await {
        Ok((file_bytes, mime_type)) => Ok((
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, mime_type),
                (header::CONTENT_DISPOSITION, "inline"),
            ],
            file_bytes,
        )
            .into_response()),
        Err(FileStorageError::InvalidFile(msg)) => Ok(build_candidate_error_response(
            CandidateServiceError::Validation(msg),
        )),
        Err(FileStorageError::NotFound(msg)) => Ok(build_candidate_error_response(
            CandidateServiceError::NotFound(msg),
        )),
        Err(FileStorageError::FileTooLarge(msg)) => Ok(build_candidate_error_response(
            CandidateServiceError::PayloadTooLarge(msg),
        )),
        Err(FileStorageError::StorageFailure(msg)) => Ok(build_candidate_error_response(
            CandidateServiceError::Internal(msg),
        )),
    }
}

/// Registers candidate profile and resume endpoints under /api/candidates.
pub fn routes() -> Routes {
    Routes::new()
        .prefix("api/candidates")
        .add("/me", get(get_profile_handler).put(update_profile_handler))
        .add("/me/resume", post(upload_resume_handler))
        .add("/resumes/{file_key}", get(download_resume_handler))
}
