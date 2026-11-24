use chrono::Utc;
use loco_rs::app::AppContext;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use serde::{Deserialize, Serialize};

use crate::{
    middleware::auth::AuthenticatedUser,
    models::{applications, candidates, jobs, recruiters},
    services::{
        auth_service::UserRole,
        file_storage_service::{validate_and_store_resume, FileStorageError},
    },
};

/// Incoming payload for updating a candidate's profile details.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCandidateProfileInput {
    pub phone_number: Option<String>,
    pub current_location: Option<String>,
    pub years_of_experience: i32,
    pub skills_summary: Option<String>,
}

/// Public JSON response combining candidate account identity, profile fields, and resume metadata.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CandidateProfileResponse {
    pub candidate_id: i32,
    pub user_id: i32,
    pub full_name: String,
    pub user_email: String,
    pub phone_number: Option<String>,
    pub current_location: Option<String>,
    pub years_of_experience: i32,
    pub skills_summary: Option<String>,
    pub resume_url: Option<String>,
    pub resume_file_name: Option<String>,
    pub resume_mime_type: Option<String>,
    pub resume_file_size_bytes: Option<i32>,
    pub resume_uploaded_at: Option<String>,
    pub updated_at: String,
}

/// Domain errors returned by candidate profile operations.
#[derive(Debug)]
pub enum CandidateServiceError {
    Validation(String),
    PayloadTooLarge(String),
    Forbidden(String),
    NotFound(String),
    Internal(String),
}

/// Maps a `candidates::Model` plus user identity into a clean JSON response.
fn map_candidate_profile(
    candidate_record: candidates::Model,
    authenticated_user: &AuthenticatedUser,
) -> CandidateProfileResponse {
    CandidateProfileResponse {
        candidate_id: candidate_record.id,
        user_id: candidate_record.user_id,
        full_name: authenticated_user.full_name.clone(),
        user_email: authenticated_user.user_email.clone(),
        phone_number: candidate_record.phone_number,
        current_location: candidate_record.current_location,
        years_of_experience: candidate_record.years_of_experience,
        skills_summary: candidate_record.skills_summary,
        resume_url: candidate_record.resume_url,
        resume_file_name: candidate_record.resume_file_name,
        resume_mime_type: candidate_record.resume_mime_type,
        resume_file_size_bytes: candidate_record.resume_file_size_bytes,
        resume_uploaded_at: candidate_record
            .resume_uploaded_at
            .map(|timestamp| timestamp.to_rfc3339()),
        updated_at: candidate_record.updated_at.to_rfc3339(),
    }
}

/// Ensures the authenticated user is a Candidate and loads (or initializes) their `candidates` row.
async fn require_candidate_record(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
) -> Result<candidates::Model, CandidateServiceError> {
    if authenticated_user.user_role != UserRole::Candidate {
        return Err(CandidateServiceError::Forbidden(String::from(
            "Only candidate accounts can access or update a candidate profile.",
        )));
    }

    if let Some(existing_profile) =
        candidates::Model::find_by_user_id(&ctx.db, authenticated_user.user_id)
            .await
            .map_err(|error| {
                CandidateServiceError::Internal(format!("Database lookup failed: {error}"))
            })?
    {
        return Ok(existing_profile);
    }

    // Create a clean baseline profile automatically if one does not exist yet.
    let created_profile = candidates::ActiveModel {
        user_id: Set(authenticated_user.user_id),
        years_of_experience: Set(0),
        ..Default::default()
    }
    .insert(&ctx.db)
    .await
    .map_err(|error| {
        CandidateServiceError::Internal(format!("Failed to initialize candidate profile: {error}"))
    })?;

    Ok(created_profile)
}

/// READ: Returns the logged-in candidate's profile and resume metadata.
pub async fn get_my_candidate_profile(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
) -> Result<CandidateProfileResponse, CandidateServiceError> {
    let candidate_record = require_candidate_record(ctx, authenticated_user).await?;
    Ok(map_candidate_profile(candidate_record, authenticated_user))
}

/// UPDATE: Validates and saves the logged-in candidate's profile fields.
pub async fn update_my_candidate_profile(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    input: UpdateCandidateProfileInput,
) -> Result<CandidateProfileResponse, CandidateServiceError> {
    let existing_record = require_candidate_record(ctx, authenticated_user).await?;

    if input.years_of_experience < 0 || input.years_of_experience > 60 {
        return Err(CandidateServiceError::Validation(String::from(
            "Years of experience must be between 0 and 60.",
        )));
    }

    let clean_phone = input
        .phone_number
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    if let Some(phone_value) = &clean_phone {
        if phone_value.len() < 7 || phone_value.len() > 25 {
            return Err(CandidateServiceError::Validation(String::from(
                "Phone number must be between 7 and 25 characters.",
            )));
        }
    }

    let clean_location = input
        .current_location
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    let clean_skills = input
        .skills_summary
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    let mut active_profile: candidates::ActiveModel = existing_record.into();
    active_profile.phone_number = Set(clean_phone);
    active_profile.current_location = Set(clean_location);
    active_profile.years_of_experience = Set(input.years_of_experience);
    active_profile.skills_summary = Set(clean_skills);
    active_profile.updated_at = Set(Utc::now().fixed_offset());

    let updated_record = active_profile.update(&ctx.db).await.map_err(|error| {
        CandidateServiceError::Internal(format!("Failed to update candidate profile: {error}"))
    })?;

    Ok(map_candidate_profile(updated_record, authenticated_user))
}

/// UPLOAD: Delegates resume validation and storage to `file_storage_service`, then saves metadata + URL in PostgreSQL.
pub async fn upload_my_resume(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    raw_file_name: &str,
    declared_mime_type: Option<&str>,
    file_bytes: &[u8],
) -> Result<CandidateProfileResponse, CandidateServiceError> {
    let existing_record = require_candidate_record(ctx, authenticated_user).await?;

    let stored_resume = validate_and_store_resume(
        authenticated_user.user_id,
        raw_file_name,
        declared_mime_type,
        file_bytes,
    )
    .await
    .map_err(|storage_error| match storage_error {
        FileStorageError::InvalidFile(msg) => CandidateServiceError::Validation(msg),
        FileStorageError::FileTooLarge(msg) => CandidateServiceError::PayloadTooLarge(msg),
        FileStorageError::NotFound(msg) => CandidateServiceError::NotFound(msg),
        FileStorageError::StorageFailure(msg) => CandidateServiceError::Internal(msg),
    })?;

    let current_timestamp = Utc::now().fixed_offset();
    let mut active_profile: candidates::ActiveModel = existing_record.into();
    active_profile.resume_url = Set(Some(stored_resume.storage_url));
    active_profile.resume_file_name = Set(Some(stored_resume.original_file_name));
    active_profile.resume_mime_type = Set(Some(stored_resume.mime_type));
    active_profile.resume_file_size_bytes = Set(Some(stored_resume.file_size_bytes));
    active_profile.resume_uploaded_at = Set(Some(current_timestamp));
    active_profile.updated_at = Set(current_timestamp);

    let updated_record = active_profile.update(&ctx.db).await.map_err(|error| {
        CandidateServiceError::Internal(format!("Failed to save resume metadata: {error}"))
    })?;

    Ok(map_candidate_profile(updated_record, authenticated_user))
}

/// AUTHORIZATION CHECK: Ensures only authorized viewers can download a stored resume file:
/// - Admins can view any resume.
/// - Candidates can only download their own resume (`resume_user{user_id}_...`).
/// - Recruiters can only download a resume if that candidate applied to one of their own jobs.
pub async fn verify_resume_download_access(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    file_key: &str,
) -> Result<(), CandidateServiceError> {
    if authenticated_user.user_role == UserRole::Admin {
        return Ok(());
    }

    // Parse the owning candidate's user ID embedded in the storage key (`resume_user{id}_{uuid}.ext`).
    let owner_user_id: i32 = file_key
        .strip_prefix("resume_user")
        .and_then(|rest| rest.split('_').next())
        .and_then(|id_part| id_part.parse::<i32>().ok())
        .ok_or_else(|| {
            CandidateServiceError::Forbidden(String::from(
                "You do not have permission to access this resume file.",
            ))
        })?;

    if authenticated_user.user_role == UserRole::Candidate {
        if owner_user_id == authenticated_user.user_id {
            return Ok(());
        }
        return Err(CandidateServiceError::Forbidden(String::from(
            "Candidates can only view their own uploaded resume.",
        )));
    }

    // Recruiter check: confirm the candidate owning this resume has applied to one of this recruiter's jobs.
    let recruiter_profile =
        recruiters::Model::find_by_user_id(&ctx.db, authenticated_user.user_id)
            .await
            .map_err(|error| CandidateServiceError::Internal(format!("DB lookup failed: {error}")))?
            .ok_or_else(|| {
                CandidateServiceError::Forbidden(String::from("Recruiter profile not found."))
            })?;

    let owner_candidate = candidates::Model::find_by_user_id(&ctx.db, owner_user_id)
        .await
        .map_err(|error| CandidateServiceError::Internal(format!("DB lookup failed: {error}")))?
        .ok_or_else(|| {
            CandidateServiceError::Forbidden(String::from(
                "Resume owner profile was not found.",
            ))
        })?;

    let owned_jobs = jobs::Model::list_by_recruiter(&ctx.db, recruiter_profile.id)
        .await
        .map_err(|error| CandidateServiceError::Internal(format!("DB lookup failed: {error}")))?;
    let owned_job_ids: Vec<i32> = owned_jobs.into_iter().map(|job| job.id).collect();

    if owned_job_ids.is_empty() {
        return Err(CandidateServiceError::Forbidden(String::from(
            "You can only view resumes of candidates who applied to your jobs.",
        )));
    }

    let matching_application = applications::Entity::find()
        .filter(applications::Column::CandidateId.eq(owner_candidate.id))
        .filter(applications::Column::JobId.is_in(owned_job_ids))
        .one(&ctx.db)
        .await
        .map_err(|error| CandidateServiceError::Internal(format!("DB lookup failed: {error}")))?;

    if matching_application.is_some() {
        Ok(())
    } else {
        Err(CandidateServiceError::Forbidden(String::from(
            "You can only view resumes of candidates who applied to your jobs.",
        )))
    }
}
