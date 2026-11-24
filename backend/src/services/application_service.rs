use std::collections::HashMap;

use chrono::Utc;
use loco_rs::app::AppContext;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
};
use serde::{Deserialize, Serialize};

use crate::{
    middleware::auth::AuthenticatedUser,
    models::{application_status_history, applications, candidates, jobs, recruiters, users},
    services::{auth_service::UserRole, notification_service},
};

/// Official Phase 6 application statuses supported across backend and frontend.
pub const VALID_APPLICATION_STATUSES: [&str; 6] = [
    "applied",
    "under_review",
    "shortlisted",
    "interview_scheduled",
    "selected",
    "rejected",
];

/// Incoming payload for submitting a new job application (POST /api/applications).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitApplicationInput {
    pub job_id: i32,
    pub cover_letter: Option<String>,
}

/// Incoming payload for recruiters updating an application's status (PATCH /api/applications/:id/status).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateApplicationStatusInput {
    pub application_status: String,
    pub status_note: Option<String>,
}

/// Optional query parameters for filtering application lists.
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationListFilters {
    pub job_id: Option<i32>,
    pub application_status: Option<String>,
}

/// Single chronological status-change event belonging to an application.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationHistoryEntry {
    pub history_id: i32,
    pub previous_status: Option<String>,
    pub new_status: String,
    pub changed_by_name: String,
    pub changed_by_role: String,
    pub status_note: Option<String>,
    pub changed_at: String,
}

/// Summary record returned when listing applications for candidates or recruiters.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationSummaryResponse {
    pub application_id: i32,
    pub job_id: i32,
    pub job_title: String,
    pub department: String,
    pub job_location: String,
    pub employment_type: String,
    pub company_name: String,
    pub candidate_id: i32,
    pub candidate_name: String,
    pub candidate_email: String,
    pub candidate_phone: Option<String>,
    pub candidate_location: Option<String>,
    pub years_of_experience: i32,
    pub skills_summary: Option<String>,
    pub application_status: String,
    pub cover_letter: Option<String>,
    pub resume_snapshot_url: Option<String>,
    pub resume_file_name: Option<String>,
    pub applied_at: String,
    pub updated_at: String,
}

/// Detailed response for a single application including its full chronological status history.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationDetailResponse {
    #[serde(flatten)]
    pub summary: ApplicationSummaryResponse,
    pub history: Vec<ApplicationHistoryEntry>,
}

/// Domain errors returned by application management operations.
#[derive(Debug)]
pub enum ApplicationServiceError {
    Validation(String),
    DuplicateApplication(String),
    Forbidden(String),
    NotFound(String),
    Internal(String),
}

/// Normalizes and validates an application status string against the 6 allowed lifecycle values.
fn normalize_application_status(raw_status: &str) -> Result<String, ApplicationServiceError> {
    let normalized = raw_status.trim().to_lowercase();
    if VALID_APPLICATION_STATUSES.contains(&normalized.as_str()) {
        Ok(normalized)
    } else {
        Err(ApplicationServiceError::Validation(String::from(
            "Invalid application status. Allowed values: applied, under_review, shortlisted, interview_scheduled, selected, rejected.",
        )))
    }
}

/// Builds a rich `ApplicationSummaryResponse` by combining application, job, recruiter, candidate, and user records.
async fn build_application_summary(
    database: &DatabaseConnection,
    application_record: applications::Model,
) -> Result<ApplicationSummaryResponse, ApplicationServiceError> {
    let job_record = jobs::Entity::find_by_id(application_record.job_id)
        .one(database)
        .await
        .map_err(|error| ApplicationServiceError::Internal(format!("Failed to load job: {error}")))?
        .ok_or_else(|| ApplicationServiceError::NotFound(String::from("Associated job not found.")))?;

    let recruiter_record = recruiters::Entity::find_by_id(job_record.recruiter_id)
        .one(database)
        .await
        .map_err(|error| {
            ApplicationServiceError::Internal(format!("Failed to load recruiter: {error}"))
        })?;

    let company_name = recruiter_record
        .map(|record| record.company_name)
        .unwrap_or_else(|| String::from("HireTrack Partner"));

    let candidate_record = candidates::Entity::find_by_id(application_record.candidate_id)
        .one(database)
        .await
        .map_err(|error| {
            ApplicationServiceError::Internal(format!("Failed to load candidate: {error}"))
        })?
        .ok_or_else(|| {
            ApplicationServiceError::NotFound(String::from("Associated candidate profile not found."))
        })?;

    let candidate_user = users::Entity::find_by_id(candidate_record.user_id)
        .one(database)
        .await
        .map_err(|error| {
            ApplicationServiceError::Internal(format!("Failed to load candidate user: {error}"))
        })?
        .ok_or_else(|| {
            ApplicationServiceError::NotFound(String::from("Associated user not found."))
        })?;

    Ok(ApplicationSummaryResponse {
        application_id: application_record.id,
        job_id: job_record.id,
        job_title: job_record.job_title,
        department: job_record.department,
        job_location: job_record.location,
        employment_type: job_record.employment_type,
        company_name,
        candidate_id: candidate_record.id,
        candidate_name: candidate_user.full_name,
        candidate_email: candidate_user.email,
        candidate_phone: candidate_record.phone_number,
        candidate_location: candidate_record.current_location,
        years_of_experience: candidate_record.years_of_experience,
        skills_summary: candidate_record.skills_summary,
        application_status: application_record.application_status,
        cover_letter: application_record.cover_letter,
        resume_snapshot_url: application_record
            .resume_snapshot_url
            .or(candidate_record.resume_url),
        resume_file_name: candidate_record.resume_file_name,
        applied_at: application_record.applied_at.to_rfc3339(),
        updated_at: application_record.updated_at.to_rfc3339(),
    })
}

/// Loads the chronological status history for an application and resolves actor display names.
async fn load_application_history(
    database: &DatabaseConnection,
    application_id: i32,
) -> Result<Vec<ApplicationHistoryEntry>, ApplicationServiceError> {
    let history_records =
        application_status_history::Model::list_for_application(database, application_id)
            .await
            .map_err(|error| {
                ApplicationServiceError::Internal(format!(
                    "Failed to load application history: {error}"
                ))
            })?;

    let user_records = users::Entity::find().all(database).await.map_err(|error| {
        ApplicationServiceError::Internal(format!("Failed to load history actors: {error}"))
    })?;

    let mut users_by_id: HashMap<i32, (String, String)> = HashMap::new();
    for user_record in user_records {
        users_by_id.insert(user_record.id, (user_record.full_name, user_record.role));
    }

    let entries = history_records
        .into_iter()
        .map(|entry| {
            let (actor_name, actor_role) = users_by_id
                .get(&entry.changed_by_user_id)
                .cloned()
                .unwrap_or_else(|| (String::from("HireTrack User"), String::from("system")));

            ApplicationHistoryEntry {
                history_id: entry.id,
                previous_status: entry.previous_status,
                new_status: entry.new_status,
                changed_by_name: actor_name,
                changed_by_role: actor_role,
                status_note: entry.status_note,
                changed_at: entry.changed_at.to_rfc3339(),
            }
        })
        .collect();

    Ok(entries)
}

/// SUBMIT APPLICATION (Candidate only):
/// 1. Confirms the caller is a Candidate and loads their candidate profile.
/// 2. Confirms the target job exists and is currently `open`.
/// 3. Prevents duplicate applications for the same `(candidate_id, job_id)` pair.
/// 4. Snapshots the candidate's uploaded resume URL and inserts the application row.
/// 5. Records the initial `applied` event in `application_status_history`.
pub async fn submit_job_application(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    input: SubmitApplicationInput,
) -> Result<ApplicationDetailResponse, ApplicationServiceError> {
    if authenticated_user.user_role != UserRole::Candidate {
        return Err(ApplicationServiceError::Forbidden(String::from(
            "Only candidate accounts can apply for job openings.",
        )));
    }

    if input.job_id <= 0 {
        return Err(ApplicationServiceError::Validation(String::from(
            "A valid job ID is required.",
        )));
    }

    // Step 1: Resolve the candidate profile linked to the logged-in user.
    let candidate_profile =
        match candidates::Model::find_by_user_id(&ctx.db, authenticated_user.user_id)
            .await
            .map_err(|error| {
                ApplicationServiceError::Internal(format!("Database lookup failed: {error}"))
            })? {
            Some(profile) => profile,
            None => candidates::ActiveModel {
                user_id: Set(authenticated_user.user_id),
                years_of_experience: Set(0),
                ..Default::default()
            }
            .insert(&ctx.db)
            .await
            .map_err(|error| {
                ApplicationServiceError::Internal(format!(
                    "Failed to initialize candidate profile: {error}"
                ))
            })?,
        };

    // Step 2: Confirm the job exists and is open to new applications.
    let target_job = jobs::Entity::find_by_id(input.job_id)
        .one(&ctx.db)
        .await
        .map_err(|error| {
            ApplicationServiceError::Internal(format!("Failed to load target job: {error}"))
        })?
        .ok_or_else(|| ApplicationServiceError::NotFound(String::from("Job opening not found.")))?;

    if target_job.job_status != "open" {
        return Err(ApplicationServiceError::Validation(String::from(
            "This job opening is no longer accepting applications.",
        )));
    }

    // Step 3: Check for an existing application before insert (backed by the DB unique index).
    let already_applied = applications::Model::exists_for_candidate_and_job(
        &ctx.db,
        candidate_profile.id,
        target_job.id,
    )
    .await
    .map_err(|error| {
        ApplicationServiceError::Internal(format!("Duplicate application check failed: {error}"))
    })?;

    if already_applied {
        return Err(ApplicationServiceError::DuplicateApplication(String::from(
            "You have already applied for this job opening.",
        )));
    }

    let clean_cover_letter = input
        .cover_letter
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty());

    // Step 4: Save the application with a snapshot of the candidate's current resume URL.
    let new_application = applications::ActiveModel {
        candidate_id: Set(candidate_profile.id),
        job_id: Set(target_job.id),
        application_status: Set(String::from("applied")),
        cover_letter: Set(clean_cover_letter),
        resume_snapshot_url: Set(candidate_profile.resume_url.clone()),
        ..Default::default()
    };

    let created_application = new_application.insert(&ctx.db).await.map_err(|error| {
        let error_text = error.to_string();
        if error_text.contains("idx_applications_candidate_job_unique")
            || error_text.contains("duplicate key")
        {
            ApplicationServiceError::DuplicateApplication(String::from(
                "You have already applied for this job opening.",
            ))
        } else {
            ApplicationServiceError::Internal(format!("Failed to submit application: {error}"))
        }
    })?;

    // Step 5: Record the initial "applied" entry in `application_status_history`.
    let initial_history = application_status_history::ActiveModel {
        application_id: Set(created_application.id),
        previous_status: Set(None),
        new_status: Set(String::from("applied")),
        changed_by_user_id: Set(authenticated_user.user_id),
        status_note: Set(Some(String::from("Application submitted by candidate."))),
        ..Default::default()
    };

    initial_history.insert(&ctx.db).await.map_err(|error| {
        ApplicationServiceError::Internal(format!(
            "Failed to record initial application history: {error}"
        ))
    })?;

    // Step 6: Notify the recruiter who owns this job that a new candidate has applied.
    if let Ok(Some(owning_recruiter)) = recruiters::Entity::find_by_id(target_job.recruiter_id)
        .one(&ctx.db)
        .await
    {
        let _ = notification_service::create_notification(
            &ctx.db,
            owning_recruiter.user_id,
            "application_received",
            format!("New application for {}", target_job.job_title),
            format!(
                "{} applied for {} ({}).",
                authenticated_user.full_name, target_job.job_title, target_job.department
            ),
        )
        .await;
    }

    let application_id = created_application.id;
    let summary = build_application_summary(&ctx.db, created_application).await?;
    let history = load_application_history(&ctx.db, application_id).await?;

    Ok(ApplicationDetailResponse { summary, history })
}

/// LIST CANDIDATE APPLICATIONS: Returns all applications submitted by the logged-in candidate.
pub async fn list_my_applications(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    filters: ApplicationListFilters,
) -> Result<Vec<ApplicationSummaryResponse>, ApplicationServiceError> {
    if authenticated_user.user_role != UserRole::Candidate {
        return Err(ApplicationServiceError::Forbidden(String::from(
            "Only candidate accounts can access their submitted applications.",
        )));
    }

    let candidate_profile =
        match candidates::Model::find_by_user_id(&ctx.db, authenticated_user.user_id)
            .await
            .map_err(|error| {
                ApplicationServiceError::Internal(format!("Database lookup failed: {error}"))
            })? {
            Some(profile) => profile,
            None => return Ok(vec![]),
        };

    let mut query = applications::Entity::find()
        .filter(applications::Column::CandidateId.eq(candidate_profile.id));

    if let Some(raw_status) = filters.application_status.as_deref().map(str::trim) {
        if !raw_status.is_empty() {
            let valid_status = normalize_application_status(raw_status)?;
            query = query.filter(applications::Column::ApplicationStatus.eq(valid_status));
        }
    }

    if let Some(job_id_filter) = filters.job_id {
        query = query.filter(applications::Column::JobId.eq(job_id_filter));
    }

    let application_records = query
        .order_by_desc(applications::Column::AppliedAt)
        .order_by_desc(applications::Column::Id)
        .all(&ctx.db)
        .await
        .map_err(|error| {
            ApplicationServiceError::Internal(format!("Failed to list applications: {error}"))
        })?;

    let mut summaries = Vec::with_capacity(application_records.len());
    for record in application_records {
        summaries.push(build_application_summary(&ctx.db, record).await?);
    }

    Ok(summaries)
}

/// LIST RECRUITER APPLICATIONS: Returns all applications submitted to jobs owned by the logged-in recruiter.
pub async fn list_recruiter_applications(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    filters: ApplicationListFilters,
) -> Result<Vec<ApplicationSummaryResponse>, ApplicationServiceError> {
    if authenticated_user.user_role != UserRole::Recruiter {
        return Err(ApplicationServiceError::Forbidden(String::from(
            "Only recruiter accounts can view applications for their job openings.",
        )));
    }

    let recruiter_profile =
        recruiters::Model::find_by_user_id(&ctx.db, authenticated_user.user_id)
            .await
            .map_err(|error| {
                ApplicationServiceError::Internal(format!("Database lookup failed: {error}"))
            })?
            .ok_or_else(|| {
                ApplicationServiceError::Forbidden(String::from(
                    "Recruiter profile was not found for this account.",
                ))
            })?;

    // Find all jobs owned by this recruiter so they never see another recruiter's applicants.
    let recruiter_jobs = jobs::Model::list_by_recruiter(&ctx.db, recruiter_profile.id)
        .await
        .map_err(|error| {
            ApplicationServiceError::Internal(format!("Failed to load recruiter jobs: {error}"))
        })?;

    let owned_job_ids: Vec<i32> = recruiter_jobs.into_iter().map(|job| job.id).collect();
    if owned_job_ids.is_empty() {
        return Ok(vec![]);
    }

    if let Some(requested_job_id) = filters.job_id {
        if !owned_job_ids.contains(&requested_job_id) {
            return Err(ApplicationServiceError::Forbidden(String::from(
                "You do not have permission to view applications for another recruiter's job.",
            )));
        }
    }

    let mut query = applications::Entity::find()
        .filter(applications::Column::JobId.is_in(owned_job_ids));

    if let Some(requested_job_id) = filters.job_id {
        query = query.filter(applications::Column::JobId.eq(requested_job_id));
    }

    if let Some(raw_status) = filters.application_status.as_deref().map(str::trim) {
        if !raw_status.is_empty() {
            let valid_status = normalize_application_status(raw_status)?;
            query = query.filter(applications::Column::ApplicationStatus.eq(valid_status));
        }
    }

    let application_records = query
        .order_by_desc(applications::Column::AppliedAt)
        .order_by_desc(applications::Column::Id)
        .all(&ctx.db)
        .await
        .map_err(|error| {
            ApplicationServiceError::Internal(format!(
                "Failed to list recruiter applications: {error}"
            ))
        })?;

    let mut summaries = Vec::with_capacity(application_records.len());
    for record in application_records {
        summaries.push(build_application_summary(&ctx.db, record).await?);
    }

    Ok(summaries)
}

/// APPLICATION DETAILS: Returns one application and its full status history to the owning candidate,
/// the owning recruiter for that job, or an Admin.
pub async fn get_application_details(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    application_id: i32,
) -> Result<ApplicationDetailResponse, ApplicationServiceError> {
    let application_record = applications::Entity::find_by_id(application_id)
        .one(&ctx.db)
        .await
        .map_err(|error| {
            ApplicationServiceError::Internal(format!("Failed to load application: {error}"))
        })?
        .ok_or_else(|| {
            ApplicationServiceError::NotFound(String::from("Application was not found."))
        })?;

    match authenticated_user.user_role {
        UserRole::Candidate => {
            let candidate_profile =
                candidates::Model::find_by_user_id(&ctx.db, authenticated_user.user_id)
                    .await
                    .map_err(|error| {
                        ApplicationServiceError::Internal(format!("Database lookup failed: {error}"))
                    })?
                    .ok_or_else(|| {
                        ApplicationServiceError::Forbidden(String::from(
                            "Candidate profile not found.",
                        ))
                    })?;

            if application_record.candidate_id != candidate_profile.id {
                return Err(ApplicationServiceError::Forbidden(String::from(
                    "You can only view your own job applications.",
                )));
            }
        }
        UserRole::Recruiter => {
            let recruiter_profile =
                recruiters::Model::find_by_user_id(&ctx.db, authenticated_user.user_id)
                    .await
                    .map_err(|error| {
                        ApplicationServiceError::Internal(format!("Database lookup failed: {error}"))
                    })?
                    .ok_or_else(|| {
                        ApplicationServiceError::Forbidden(String::from(
                            "Recruiter profile not found.",
                        ))
                    })?;

            let target_job = jobs::Entity::find_by_id(application_record.job_id)
                .one(&ctx.db)
                .await
                .map_err(|error| {
                    ApplicationServiceError::Internal(format!("Failed to load job: {error}"))
                })?
                .ok_or_else(|| {
                    ApplicationServiceError::NotFound(String::from("Associated job not found."))
                })?;

            if target_job.recruiter_id != recruiter_profile.id {
                return Err(ApplicationServiceError::Forbidden(String::from(
                    "You can only inspect applications submitted to your own job openings.",
                )));
            }
        }
        UserRole::Admin => {
            // Admins can inspect any application for oversight.
        }
    }

    let summary = build_application_summary(&ctx.db, application_record).await?;
    let history = load_application_history(&ctx.db, application_id).await?;

    Ok(ApplicationDetailResponse { summary, history })
}

/// UPDATE STATUS (Owning Recruiter only): Transitions an application to a new valid status
/// and records the change in `application_status_history`.
pub async fn update_application_status(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    application_id: i32,
    input: UpdateApplicationStatusInput,
) -> Result<ApplicationDetailResponse, ApplicationServiceError> {
    if authenticated_user.user_role != UserRole::Recruiter {
        return Err(ApplicationServiceError::Forbidden(String::from(
            "Only the job's recruiter can update application status.",
        )));
    }

    let next_status = normalize_application_status(&input.application_status)?;

    let existing_application = applications::Entity::find_by_id(application_id)
        .one(&ctx.db)
        .await
        .map_err(|error| {
            ApplicationServiceError::Internal(format!("Failed to load application: {error}"))
        })?
        .ok_or_else(|| {
            ApplicationServiceError::NotFound(String::from("Application was not found."))
        })?;

    let recruiter_profile =
        recruiters::Model::find_by_user_id(&ctx.db, authenticated_user.user_id)
            .await
            .map_err(|error| {
                ApplicationServiceError::Internal(format!("Database lookup failed: {error}"))
            })?
            .ok_or_else(|| {
                ApplicationServiceError::Forbidden(String::from("Recruiter profile not found."))
            })?;

    let target_job = jobs::Entity::find_by_id(existing_application.job_id)
        .one(&ctx.db)
        .await
        .map_err(|error| {
            ApplicationServiceError::Internal(format!("Failed to load job: {error}"))
        })?
        .ok_or_else(|| {
            ApplicationServiceError::NotFound(String::from("Associated job not found."))
        })?;

    if target_job.recruiter_id != recruiter_profile.id {
        return Err(ApplicationServiceError::Forbidden(String::from(
            "You do not have permission to update applications for another recruiter's job.",
        )));
    }

    let previous_status = existing_application.application_status.clone();
    let clean_note = input
        .status_note
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty());

    // Update the application row with the new status and timestamp.
    let mut active_application: applications::ActiveModel = existing_application.into();
    active_application.application_status = Set(next_status.clone());
    active_application.updated_at = Set(Utc::now().fixed_offset());

    let updated_application = active_application.update(&ctx.db).await.map_err(|error| {
        ApplicationServiceError::Internal(format!("Failed to update application status: {error}"))
    })?;

    // Append an immutable audit entry to `application_status_history`.
    let history_entry = application_status_history::ActiveModel {
        application_id: Set(application_id),
        previous_status: Set(Some(previous_status)),
        new_status: Set(next_status.clone()),
        changed_by_user_id: Set(authenticated_user.user_id),
        status_note: Set(clean_note),
        ..Default::default()
    };

    history_entry.insert(&ctx.db).await.map_err(|error| {
        ApplicationServiceError::Internal(format!(
            "Failed to record status change history: {error}"
        ))
    })?;

    // Notify the candidate whose application status changed.
    if let Ok(Some(candidate_record)) =
        candidates::Entity::find_by_id(updated_application.candidate_id)
            .one(&ctx.db)
            .await
    {
        let status_label = next_status.replace('_', " ");
        let _ = notification_service::create_notification(
            &ctx.db,
            candidate_record.user_id,
            "status_updated",
            format!("Application update: {}", target_job.job_title),
            format!(
                "Your application for {} is now '{}'.",
                target_job.job_title, status_label
            ),
        )
        .await;
    }

    let summary = build_application_summary(&ctx.db, updated_application).await?;
    let history = load_application_history(&ctx.db, application_id).await?;

    Ok(ApplicationDetailResponse { summary, history })
}
