use chrono::Utc;
use loco_rs::app::AppContext;
use sea_orm::{
    sea_query::{extension::postgres::PgExpr, Expr},
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, EntityTrait, QueryFilter,
    QueryOrder, Set,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::{
    middleware::auth::AuthenticatedUser,
    models::{jobs, recruiters},
    services::auth_service::UserRole,
};

const VALID_EMPLOYMENT_TYPES: [&str; 4] = ["full_time", "part_time", "contract", "internship"];
const VALID_JOB_STATUSES: [&str; 3] = ["open", "paused", "closed"];

/// Incoming payload used to create a new job opening.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateJobInput {
    pub job_title: String,
    pub department: String,
    pub job_location: String,
    pub employment_type: String,
    pub salary_min: Option<i32>,
    pub salary_max: Option<i32>,
    pub job_description: String,
    pub requirements: Option<String>,
    pub job_status: Option<String>,
}

/// Incoming payload used to update an existing job opening.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateJobInput {
    pub job_title: String,
    pub department: String,
    pub job_location: String,
    pub employment_type: String,
    pub salary_min: Option<i32>,
    pub salary_max: Option<i32>,
    pub job_description: String,
    pub requirements: Option<String>,
    pub job_status: String,
}

/// Optional query parameters for searching and filtering jobs.
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobSearchFilters {
    pub search: Option<String>,
    pub department: Option<String>,
    pub job_location: Option<String>,
    pub employment_type: Option<String>,
    pub job_status: Option<String>,
    pub mine: Option<bool>,
}

/// Clean JSON representation of a job opening returned to the frontend.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobResponse {
    pub job_id: i32,
    pub recruiter_id: i32,
    pub company_name: String,
    pub job_title: String,
    pub department: String,
    pub job_location: String,
    pub employment_type: String,
    pub salary_min: Option<i32>,
    pub salary_max: Option<i32>,
    pub job_description: String,
    pub requirements: Option<String>,
    pub job_status: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Domain errors returned by job management service functions.
#[derive(Debug)]
pub enum JobServiceError {
    Validation(String),
    Forbidden(String),
    NotFound(String),
    Internal(String),
}

/// Validated, normalized fields shared between job creation and update operations.
struct ValidatedJobFields {
    job_title: String,
    department: String,
    job_location: String,
    employment_type: String,
    salary_min: Option<i32>,
    salary_max: Option<i32>,
    job_description: String,
    requirements: Option<String>,
    job_status: String,
}

/// Unvalidated fields passed into `validate_job_fields` from create or update operations.
struct RawJobFields<'a> {
    job_title: &'a str,
    department: &'a str,
    job_location: &'a str,
    employment_type: &'a str,
    salary_min: Option<i32>,
    salary_max: Option<i32>,
    job_description: &'a str,
    requirements: Option<String>,
    job_status: &'a str,
}

/// Validates and normalizes all incoming job fields before writing to PostgreSQL.
fn validate_job_fields(raw: RawJobFields<'_>) -> Result<ValidatedJobFields, JobServiceError> {
    let clean_title = raw.job_title.trim().to_string();
    let clean_department = raw.department.trim().to_string();
    let clean_location = raw.job_location.trim().to_string();
    let clean_employment_type = raw.employment_type.trim().to_lowercase();
    let clean_description = raw.job_description.trim().to_string();
    let clean_status = raw.job_status.trim().to_lowercase();
    let clean_requirements = raw
        .requirements
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty());
    let salary_min = raw.salary_min;
    let salary_max = raw.salary_max;

    if clean_title.len() < 3 || clean_title.len() > 150 {
        return Err(JobServiceError::Validation(String::from(
            "Job title must be between 3 and 150 characters.",
        )));
    }

    if clean_department.len() < 2 || clean_department.len() > 100 {
        return Err(JobServiceError::Validation(String::from(
            "Department must be between 2 and 100 characters.",
        )));
    }

    if clean_location.len() < 2 || clean_location.len() > 120 {
        return Err(JobServiceError::Validation(String::from(
            "Job location must be between 2 and 120 characters.",
        )));
    }

    if !VALID_EMPLOYMENT_TYPES.contains(&clean_employment_type.as_str()) {
        return Err(JobServiceError::Validation(String::from(
            "Employment type must be one of: full_time, part_time, contract, or internship.",
        )));
    }

    if clean_description.len() < 20 {
        return Err(JobServiceError::Validation(String::from(
            "Job description must be at least 20 characters long.",
        )));
    }

    if !VALID_JOB_STATUSES.contains(&clean_status.as_str()) {
        return Err(JobServiceError::Validation(String::from(
            "Job status must be one of: open, paused, or closed.",
        )));
    }

    if let Some(min_salary) = salary_min {
        if min_salary < 0 {
            return Err(JobServiceError::Validation(String::from(
                "Minimum salary cannot be negative.",
            )));
        }
    }

    if let Some(max_salary) = salary_max {
        if max_salary < 0 {
            return Err(JobServiceError::Validation(String::from(
                "Maximum salary cannot be negative.",
            )));
        }
    }

    if let (Some(min_salary), Some(max_salary)) = (salary_min, salary_max) {
        if min_salary > max_salary {
            return Err(JobServiceError::Validation(String::from(
                "Minimum salary cannot be greater than maximum salary.",
            )));
        }
    }

    Ok(ValidatedJobFields {
        job_title: clean_title,
        department: clean_department,
        job_location: clean_location,
        employment_type: clean_employment_type,
        salary_min,
        salary_max,
        job_description: clean_description,
        requirements: clean_requirements,
        job_status: clean_status,
    })
}

/// Converts a `jobs::Model` and recruiter company name into a frontend-friendly `JobResponse`.
fn map_job_to_response(job_record: jobs::Model, company_name: String) -> JobResponse {
    JobResponse {
        job_id: job_record.id,
        recruiter_id: job_record.recruiter_id,
        company_name,
        job_title: job_record.job_title,
        department: job_record.department,
        job_location: job_record.location,
        employment_type: job_record.employment_type,
        salary_min: job_record.salary_min,
        salary_max: job_record.salary_max,
        job_description: job_record.description,
        requirements: job_record.requirements,
        job_status: job_record.job_status,
        created_at: job_record.created_at.to_rfc3339(),
        updated_at: job_record.updated_at.to_rfc3339(),
    }
}

/// Resolves the recruiter profile linked to the authenticated user.
async fn require_recruiter_profile(
    database: &DatabaseConnection,
    authenticated_user: &AuthenticatedUser,
) -> Result<recruiters::Model, JobServiceError> {
    if authenticated_user.user_role != UserRole::Recruiter {
        return Err(JobServiceError::Forbidden(String::from(
            "Only recruiter accounts can perform this job management action.",
        )));
    }

    recruiters::Model::find_by_user_id(database, authenticated_user.user_id)
        .await
        .map_err(|error| JobServiceError::Internal(format!("Database lookup failed: {error}")))?
        .ok_or_else(|| {
            JobServiceError::Forbidden(String::from(
                "Recruiter profile was not found for this account.",
            ))
        })
}

/// Loads company names for a list of recruiter IDs so each job response includes its company name.
async fn load_company_names_by_recruiter(
    database: &DatabaseConnection,
) -> Result<HashMap<i32, String>, JobServiceError> {
    let recruiter_records = recruiters::Entity::find()
        .all(database)
        .await
        .map_err(|error| JobServiceError::Internal(format!("Failed to load recruiters: {error}")))?;

    let mut company_map = HashMap::new();
    for recruiter_record in recruiter_records {
        company_map.insert(recruiter_record.id, recruiter_record.company_name);
    }

    Ok(company_map)
}

/// Ensures the caller is allowed to modify or delete a specific job opening.
/// Recruiters may only manage their own job openings; Admins may close/delete jobs for moderation.
async fn verify_job_management_permission(
    database: &DatabaseConnection,
    authenticated_user: &AuthenticatedUser,
    job_record: &jobs::Model,
    allow_admin: bool,
) -> Result<String, JobServiceError> {
    if authenticated_user.user_role == UserRole::Admin && allow_admin {
        let recruiter_record = recruiters::Entity::find_by_id(job_record.recruiter_id)
            .one(database)
            .await
            .map_err(|error| JobServiceError::Internal(format!("Database lookup failed: {error}")))?;

        let company_name = recruiter_record
            .map(|record| record.company_name)
            .unwrap_or_else(|| String::from("HireTrack Partner"));

        return Ok(company_name);
    }

    let recruiter_profile = require_recruiter_profile(database, authenticated_user).await?;

    if job_record.recruiter_id != recruiter_profile.id {
        return Err(JobServiceError::Forbidden(String::from(
            "You do not have permission to manage another recruiter's job opening.",
        )));
    }

    Ok(recruiter_profile.company_name)
}

/// CREATE: Creates a new job opening owned by the authenticated recruiter.
pub async fn create_job(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    input: CreateJobInput,
) -> Result<JobResponse, JobServiceError> {
    // Only authenticated recruiters can publish job openings.
    let recruiter_profile = require_recruiter_profile(&ctx.db, authenticated_user).await?;

    let requested_status = input.job_status.as_deref().unwrap_or("open");
    let validated = validate_job_fields(RawJobFields {
        job_title: &input.job_title,
        department: &input.department,
        job_location: &input.job_location,
        employment_type: &input.employment_type,
        salary_min: input.salary_min,
        salary_max: input.salary_max,
        job_description: &input.job_description,
        requirements: input.requirements,
        job_status: requested_status,
    })?;

    let new_job = jobs::ActiveModel {
        recruiter_id: Set(recruiter_profile.id),
        job_title: Set(validated.job_title),
        department: Set(validated.department),
        location: Set(validated.job_location),
        employment_type: Set(validated.employment_type),
        salary_min: Set(validated.salary_min),
        salary_max: Set(validated.salary_max),
        description: Set(validated.job_description),
        requirements: Set(validated.requirements),
        job_status: Set(validated.job_status),
        ..Default::default()
    };

    let created_job = new_job
        .insert(&ctx.db)
        .await
        .map_err(|error| JobServiceError::Internal(format!("Failed to create job: {error}")))?;

    Ok(map_job_to_response(created_job, recruiter_profile.company_name))
}

/// READ (List): Returns jobs filtered by search keywords, location, department, employment type, and role permissions.
pub async fn list_jobs(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    filters: JobSearchFilters,
) -> Result<Vec<JobResponse>, JobServiceError> {
    let mut query = jobs::Entity::find();

    // Enforce role-based visibility:
    // - Candidates can ONLY view active ("open") job openings.
    // - Recruiters passing `mine=true` see all of their own jobs across every status;
    //   otherwise they browse all active ("open") job openings.
    // - Admins can view all jobs and optionally filter by status.
    match authenticated_user.user_role {
        UserRole::Candidate => {
            query = query.filter(jobs::Column::JobStatus.eq("open"));
        }
        UserRole::Recruiter => {
            if filters.mine.unwrap_or(false) {
                let recruiter_profile =
                    require_recruiter_profile(&ctx.db, authenticated_user).await?;
                query = query.filter(jobs::Column::RecruiterId.eq(recruiter_profile.id));

                if let Some(status_filter) = filters.job_status.as_deref().map(str::trim) {
                    if !status_filter.is_empty() && VALID_JOB_STATUSES.contains(&status_filter) {
                        query = query.filter(jobs::Column::JobStatus.eq(status_filter));
                    }
                }
            } else {
                query = query.filter(jobs::Column::JobStatus.eq("open"));
            }
        }
        UserRole::Admin => {
            if let Some(status_filter) = filters.job_status.as_deref().map(str::trim) {
                if !status_filter.is_empty() && VALID_JOB_STATUSES.contains(&status_filter) {
                    query = query.filter(jobs::Column::JobStatus.eq(status_filter));
                }
            }
        }
    }

    // Apply optional employment type filter.
    if let Some(employment_filter) = filters.employment_type.as_deref().map(str::trim) {
        let clean_employment = employment_filter.to_lowercase();
        if !clean_employment.is_empty() && VALID_EMPLOYMENT_TYPES.contains(&clean_employment.as_str())
        {
            query = query.filter(jobs::Column::EmploymentType.eq(clean_employment));
        }
    }

    // Apply optional department filter (case-insensitive PostgreSQL ILIKE match).
    if let Some(department_filter) = filters.department.as_deref().map(str::trim) {
        if !department_filter.is_empty() {
            let pattern = format!("%{department_filter}%");
            query = query.filter(Expr::col(jobs::Column::Department).ilike(pattern));
        }
    }

    // Apply optional location filter (case-insensitive PostgreSQL ILIKE match).
    if let Some(location_filter) = filters.job_location.as_deref().map(str::trim) {
        if !location_filter.is_empty() {
            let pattern = format!("%{location_filter}%");
            query = query.filter(Expr::col(jobs::Column::Location).ilike(pattern));
        }
    }

    // Apply optional keyword search across title, department, location, and description.
    if let Some(search_keyword) = filters.search.as_deref().map(str::trim) {
        if !search_keyword.is_empty() {
            let pattern = format!("%{search_keyword}%");
            let search_condition = Condition::any()
                .add(Expr::col(jobs::Column::JobTitle).ilike(pattern.clone()))
                .add(Expr::col(jobs::Column::Department).ilike(pattern.clone()))
                .add(Expr::col(jobs::Column::Location).ilike(pattern.clone()))
                .add(Expr::col(jobs::Column::Description).ilike(pattern));
            query = query.filter(search_condition);
        }
    }

    let job_records = query
        .order_by_desc(jobs::Column::CreatedAt)
        .order_by_desc(jobs::Column::Id)
        .all(&ctx.db)
        .await
        .map_err(|error| JobServiceError::Internal(format!("Failed to list jobs: {error}")))?;

    let company_names = load_company_names_by_recruiter(&ctx.db).await?;

    let responses = job_records
        .into_iter()
        .map(|job_record| {
            let company_name = company_names
                .get(&job_record.recruiter_id)
                .cloned()
                .unwrap_or_else(|| String::from("HireTrack Partner"));
            map_job_to_response(job_record, company_name)
        })
        .collect();

    Ok(responses)
}

/// READ (Single): Returns detailed information for one job while enforcing active-only visibility for candidates.
pub async fn get_job_by_id(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    job_id: i32,
) -> Result<JobResponse, JobServiceError> {
    let job_record = jobs::Entity::find_by_id(job_id)
        .one(&ctx.db)
        .await
        .map_err(|error| JobServiceError::Internal(format!("Failed to load job: {error}")))?
        .ok_or_else(|| JobServiceError::NotFound(String::from("Job opening was not found.")))?;

    // Candidates may only view active ("open") job openings.
    if authenticated_user.user_role == UserRole::Candidate && job_record.job_status != "open" {
        return Err(JobServiceError::NotFound(String::from(
            "This job opening is no longer active.",
        )));
    }

    // Recruiters may view any open job, or their own paused/closed jobs.
    if authenticated_user.user_role == UserRole::Recruiter && job_record.job_status != "open" {
        let recruiter_profile = require_recruiter_profile(&ctx.db, authenticated_user).await?;
        if job_record.recruiter_id != recruiter_profile.id {
            return Err(JobServiceError::Forbidden(String::from(
                "You cannot view another recruiter's inactive job opening.",
            )));
        }
    }

    let recruiter_record = recruiters::Entity::find_by_id(job_record.recruiter_id)
        .one(&ctx.db)
        .await
        .map_err(|error| JobServiceError::Internal(format!("Failed to load recruiter: {error}")))?;

    let company_name = recruiter_record
        .map(|record| record.company_name)
        .unwrap_or_else(|| String::from("HireTrack Partner"));

    Ok(map_job_to_response(job_record, company_name))
}

/// UPDATE: Updates an existing job opening after verifying ownership and validating all fields.
pub async fn update_job(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    job_id: i32,
    input: UpdateJobInput,
) -> Result<JobResponse, JobServiceError> {
    let existing_job = jobs::Entity::find_by_id(job_id)
        .one(&ctx.db)
        .await
        .map_err(|error| JobServiceError::Internal(format!("Failed to load job: {error}")))?
        .ok_or_else(|| JobServiceError::NotFound(String::from("Job opening was not found.")))?;

    // Only the recruiter who owns the job opening can edit its details.
    let company_name =
        verify_job_management_permission(&ctx.db, authenticated_user, &existing_job, false).await?;

    let validated = validate_job_fields(RawJobFields {
        job_title: &input.job_title,
        department: &input.department,
        job_location: &input.job_location,
        employment_type: &input.employment_type,
        salary_min: input.salary_min,
        salary_max: input.salary_max,
        job_description: &input.job_description,
        requirements: input.requirements,
        job_status: &input.job_status,
    })?;

    let mut active_job: jobs::ActiveModel = existing_job.into();
    active_job.job_title = Set(validated.job_title);
    active_job.department = Set(validated.department);
    active_job.location = Set(validated.job_location);
    active_job.employment_type = Set(validated.employment_type);
    active_job.salary_min = Set(validated.salary_min);
    active_job.salary_max = Set(validated.salary_max);
    active_job.description = Set(validated.job_description);
    active_job.requirements = Set(validated.requirements);
    active_job.job_status = Set(validated.job_status);
    active_job.updated_at = Set(Utc::now().fixed_offset());

    let updated_job = active_job
        .update(&ctx.db)
        .await
        .map_err(|error| JobServiceError::Internal(format!("Failed to update job: {error}")))?;

    Ok(map_job_to_response(updated_job, company_name))
}

/// UPDATE (Close): Marks a job opening as `closed` so candidates can no longer view it.
pub async fn close_job(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    job_id: i32,
) -> Result<JobResponse, JobServiceError> {
    let existing_job = jobs::Entity::find_by_id(job_id)
        .one(&ctx.db)
        .await
        .map_err(|error| JobServiceError::Internal(format!("Failed to load job: {error}")))?
        .ok_or_else(|| JobServiceError::NotFound(String::from("Job opening was not found.")))?;

    let company_name =
        verify_job_management_permission(&ctx.db, authenticated_user, &existing_job, true).await?;

    let mut active_job: jobs::ActiveModel = existing_job.into();
    active_job.job_status = Set(String::from("closed"));
    active_job.updated_at = Set(Utc::now().fixed_offset());

    let closed_job = active_job
        .update(&ctx.db)
        .await
        .map_err(|error| JobServiceError::Internal(format!("Failed to close job: {error}")))?;

    Ok(map_job_to_response(closed_job, company_name))
}

/// DELETE: Permanently removes a job opening after confirming ownership or Admin permission.
pub async fn delete_job(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    job_id: i32,
) -> Result<(), JobServiceError> {
    let existing_job = jobs::Entity::find_by_id(job_id)
        .one(&ctx.db)
        .await
        .map_err(|error| JobServiceError::Internal(format!("Failed to load job: {error}")))?
        .ok_or_else(|| JobServiceError::NotFound(String::from("Job opening was not found.")))?;

    let _company_name =
        verify_job_management_permission(&ctx.db, authenticated_user, &existing_job, true).await?;

    let active_job: jobs::ActiveModel = existing_job.into();
    active_job
        .delete(&ctx.db)
        .await
        .map_err(|error| JobServiceError::Internal(format!("Failed to delete job: {error}")))?;

    Ok(())
}
