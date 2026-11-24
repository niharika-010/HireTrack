use chrono::{DateTime, FixedOffset, Utc};
use loco_rs::app::AppContext;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, EntityTrait, QueryFilter,
    QueryOrder, Set,
};
use serde::{Deserialize, Serialize};

use crate::{
    middleware::auth::AuthenticatedUser,
    models::{
        application_status_history, applications, candidates, interviews, jobs, recruiters, users,
    },
    services::{auth_service::UserRole, notification_service},
};

const VALID_INTERVIEW_ROUNDS: [&str; 2] = ["technical", "hr"];
const VALID_INTERVIEW_MODES: [&str; 3] = ["video", "phone", "in_person"];
const VALID_INTERVIEW_STATUSES: [&str; 4] = ["scheduled", "rescheduled", "completed", "cancelled"];
const VALID_INTERVIEW_RESULTS: [&str; 4] = ["pending", "passed", "failed", "on_hold"];

/// Request payload for scheduling a new interview (POST /api/interviews).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleInterviewInput {
    pub application_id: i32,
    pub interviewer_name: String,
    pub interviewer_email: Option<String>,
    pub interview_round: String,
    pub interview_date: String,
    pub duration_minutes: i32,
    pub interview_mode: String,
    pub meeting_link: Option<String>,
    pub interviewer_notes: Option<String>,
}

/// Request payload for editing or rescheduling an existing interview (PUT /api/interviews/:id).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInterviewInput {
    pub interviewer_name: String,
    pub interviewer_email: Option<String>,
    pub interview_round: String,
    pub interview_date: String,
    pub duration_minutes: i32,
    pub interview_mode: String,
    pub meeting_link: Option<String>,
    pub interview_status: String,
    pub interviewer_notes: Option<String>,
}

/// Request payload for recording interview feedback and updating the evaluation result (PATCH /api/interviews/:id/feedback).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordInterviewFeedbackInput {
    pub interview_feedback: String,
    pub interview_rating: Option<i32>,
    pub interview_result: String,
    pub interview_status: Option<String>,
}

/// Query parameters for listing and filtering interviews.
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InterviewListFilters {
    pub scope: Option<String>,
    pub interview_round: Option<String>,
    pub interview_status: Option<String>,
    pub interview_result: Option<String>,
    pub application_id: Option<i32>,
}

/// Complete interview representation returned by all interview endpoints.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InterviewResponse {
    pub interview_id: i32,
    pub application_id: i32,
    pub job_id: i32,
    pub job_title: String,
    pub department: String,
    pub company_name: String,
    pub candidate_id: i32,
    pub candidate_name: String,
    pub candidate_email: String,
    pub recruiter_id: i32,
    pub interviewer_name: String,
    pub interviewer_email: Option<String>,
    pub interview_round: String,
    pub interview_date: String,
    pub duration_minutes: i32,
    pub interview_mode: String,
    pub meeting_link: Option<String>,
    pub interview_status: String,
    pub interviewer_notes: Option<String>,
    pub interview_feedback: Option<String>,
    pub interview_rating: Option<i32>,
    pub interview_result: String,
    pub feedback_submitted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Domain errors returned by interview scheduling and feedback service functions.
#[derive(Debug)]
pub enum InterviewServiceError {
    Validation(String),
    Forbidden(String),
    NotFound(String),
    Internal(String),
}

/// Parses an ISO-8601 interview date string and optionally requires it to be in the future.
fn parse_and_validate_interview_date(
    raw_interview_date: &str,
    must_be_in_future: bool,
) -> Result<DateTime<FixedOffset>, InterviewServiceError> {
    let trimmed = raw_interview_date.trim();
    let parsed_date = DateTime::parse_from_rfc3339(trimmed).map_err(|_| {
        InterviewServiceError::Validation(String::from(
            "Invalid interview date format. Please provide a valid ISO-8601 date and time.",
        ))
    })?;

    if must_be_in_future && parsed_date.with_timezone(&Utc) <= Utc::now() {
        return Err(InterviewServiceError::Validation(String::from(
            "Interview date and time must be scheduled in the future.",
        )));
    }

    Ok(parsed_date)
}

/// Validates shared scheduling fields (interviewer details, round, duration, and mode).
fn validate_schedule_fields(
    interviewer_name: &str,
    interviewer_email: Option<String>,
    interview_round: &str,
    duration_minutes: i32,
    interview_mode: &str,
) -> Result<(String, Option<String>, String, String), InterviewServiceError> {
    let clean_name = interviewer_name.trim().to_string();
    if clean_name.len() < 2 || clean_name.len() > 120 {
        return Err(InterviewServiceError::Validation(String::from(
            "Interviewer name must be between 2 and 120 characters.",
        )));
    }

    let clean_email = interviewer_email
        .map(|value| value.trim().to_lowercase())
        .filter(|value| !value.is_empty());

    if let Some(email_value) = &clean_email {
        if !email_value.contains('@') || !email_value.contains('.') || email_value.contains(' ') {
            return Err(InterviewServiceError::Validation(String::from(
                "Please provide a valid interviewer email address.",
            )));
        }
    }

    let clean_round = interview_round.trim().to_lowercase();
    if !VALID_INTERVIEW_ROUNDS.contains(&clean_round.as_str()) {
        return Err(InterviewServiceError::Validation(String::from(
            "Interview round must be either 'technical' or 'hr'.",
        )));
    }

    if !(15..=240).contains(&duration_minutes) {
        return Err(InterviewServiceError::Validation(String::from(
            "Interview duration must be between 15 and 240 minutes.",
        )));
    }

    let clean_mode = interview_mode.trim().to_lowercase();
    if !VALID_INTERVIEW_MODES.contains(&clean_mode.as_str()) {
        return Err(InterviewServiceError::Validation(String::from(
            "Interview mode must be one of: video, phone, or in_person.",
        )));
    }

    Ok((clean_name, clean_email, clean_round, clean_mode))
}

/// Resolves the recruiter profile for the authenticated user and confirms recruiter role.
async fn require_recruiter_profile(
    database: &DatabaseConnection,
    authenticated_user: &AuthenticatedUser,
) -> Result<recruiters::Model, InterviewServiceError> {
    if authenticated_user.user_role != UserRole::Recruiter {
        return Err(InterviewServiceError::Forbidden(String::from(
            "Only authorized recruiters can schedule or manage interviews.",
        )));
    }

    recruiters::Model::find_by_user_id(database, authenticated_user.user_id)
        .await
        .map_err(|error| InterviewServiceError::Internal(format!("Database lookup failed: {error}")))?
        .ok_or_else(|| {
            InterviewServiceError::Forbidden(String::from(
                "Recruiter profile was not found for this account.",
            ))
        })
}

/// Builds a rich `InterviewResponse` by joining application, job, recruiter, candidate, and user records.
async fn build_interview_response(
    database: &DatabaseConnection,
    interview_record: interviews::Model,
) -> Result<InterviewResponse, InterviewServiceError> {
    let application_record = applications::Entity::find_by_id(interview_record.application_id)
        .one(database)
        .await
        .map_err(|error| {
            InterviewServiceError::Internal(format!("Failed to load application: {error}"))
        })?
        .ok_or_else(|| {
            InterviewServiceError::NotFound(String::from("Associated application not found."))
        })?;

    let job_record = jobs::Entity::find_by_id(application_record.job_id)
        .one(database)
        .await
        .map_err(|error| InterviewServiceError::Internal(format!("Failed to load job: {error}")))?
        .ok_or_else(|| {
            InterviewServiceError::NotFound(String::from("Associated job not found."))
        })?;

    let recruiter_record = recruiters::Entity::find_by_id(interview_record.recruiter_id)
        .one(database)
        .await
        .map_err(|error| {
            InterviewServiceError::Internal(format!("Failed to load recruiter: {error}"))
        })?;

    let company_name = recruiter_record
        .map(|record| record.company_name)
        .unwrap_or_else(|| String::from("HireTrack Partner"));

    let candidate_record = candidates::Entity::find_by_id(application_record.candidate_id)
        .one(database)
        .await
        .map_err(|error| {
            InterviewServiceError::Internal(format!("Failed to load candidate: {error}"))
        })?
        .ok_or_else(|| {
            InterviewServiceError::NotFound(String::from("Associated candidate not found."))
        })?;

    let candidate_user = users::Entity::find_by_id(candidate_record.user_id)
        .one(database)
        .await
        .map_err(|error| InterviewServiceError::Internal(format!("Failed to load user: {error}")))?
        .ok_or_else(|| {
            InterviewServiceError::NotFound(String::from("Associated candidate user not found."))
        })?;

    Ok(InterviewResponse {
        interview_id: interview_record.id,
        application_id: interview_record.application_id,
        job_id: job_record.id,
        job_title: job_record.job_title,
        department: job_record.department,
        company_name,
        candidate_id: candidate_record.id,
        candidate_name: candidate_user.full_name,
        candidate_email: candidate_user.email,
        recruiter_id: interview_record.recruiter_id,
        interviewer_name: interview_record.interviewer_name,
        interviewer_email: interview_record.interviewer_email,
        interview_round: interview_record.interview_round,
        interview_date: interview_record.scheduled_at.to_rfc3339(),
        duration_minutes: interview_record.duration_minutes,
        interview_mode: interview_record.interview_mode,
        meeting_link: interview_record.meeting_link,
        interview_status: interview_record.interview_status,
        interviewer_notes: interview_record.interviewer_notes,
        interview_feedback: interview_record.interview_feedback,
        interview_rating: interview_record.interview_rating,
        interview_result: interview_record.interview_result,
        feedback_submitted_at: interview_record
            .feedback_submitted_at
            .map(|timestamp| timestamp.to_rfc3339()),
        created_at: interview_record.created_at.to_rfc3339(),
        updated_at: interview_record.updated_at.to_rfc3339(),
    })
}

/// SCHEDULE INTERVIEW (Owning Recruiter only):
/// 1. Verifies the caller is a Recruiter and owns the job linked to `application_id`.
/// 2. Rejects scheduling on already rejected applications.
/// 3. Validates future `interviewDate`, `interviewerName`, `interviewRound` (`technical`/`hr`), duration, and mode.
/// 4. Persists the interview in `interviews`.
/// 5. Automatically transitions the application status to `interview_scheduled` with a history log entry.
pub async fn schedule_interview(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    input: ScheduleInterviewInput,
) -> Result<InterviewResponse, InterviewServiceError> {
    let recruiter_profile = require_recruiter_profile(&ctx.db, authenticated_user).await?;

    // Step 1: Load the application and confirm the associated job belongs to this recruiter.
    let application_record = applications::Entity::find_by_id(input.application_id)
        .one(&ctx.db)
        .await
        .map_err(|error| {
            InterviewServiceError::Internal(format!("Failed to load application: {error}"))
        })?
        .ok_or_else(|| {
            InterviewServiceError::NotFound(String::from("Job application was not found."))
        })?;

    let target_job = jobs::Entity::find_by_id(application_record.job_id)
        .one(&ctx.db)
        .await
        .map_err(|error| InterviewServiceError::Internal(format!("Failed to load job: {error}")))?
        .ok_or_else(|| InterviewServiceError::NotFound(String::from("Job opening not found.")))?;

    if target_job.recruiter_id != recruiter_profile.id {
        return Err(InterviewServiceError::Forbidden(String::from(
            "You do not have permission to schedule interviews for another recruiter's application.",
        )));
    }

    // Step 2: Prevent scheduling interviews on rejected applications.
    if application_record.application_status == "rejected" {
        return Err(InterviewServiceError::Validation(String::from(
            "Cannot schedule an interview for a rejected application.",
        )));
    }

    // Step 3: Validate future date/time, interviewer details, round, duration, and mode.
    let scheduled_timestamp = parse_and_validate_interview_date(&input.interview_date, true)?;
    let (clean_interviewer_name, clean_interviewer_email, clean_round, clean_mode) =
        validate_schedule_fields(
            &input.interviewer_name,
            input.interviewer_email,
            &input.interview_round,
            input.duration_minutes,
            &input.interview_mode,
        )?;

    let clean_meeting_link = input
        .meeting_link
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let clean_notes = input
        .interviewer_notes
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    // Step 4: Insert the new interview record in PostgreSQL.
    let new_interview = interviews::ActiveModel {
        application_id: Set(application_record.id),
        recruiter_id: Set(recruiter_profile.id),
        interviewer_name: Set(clean_interviewer_name.clone()),
        interviewer_email: Set(clean_interviewer_email),
        interview_round: Set(clean_round.clone()),
        scheduled_at: Set(scheduled_timestamp),
        duration_minutes: Set(input.duration_minutes),
        interview_mode: Set(clean_mode),
        meeting_link: Set(clean_meeting_link),
        interview_status: Set(String::from("scheduled")),
        interviewer_notes: Set(clean_notes),
        interview_result: Set(String::from("pending")),
        ..Default::default()
    };

    let created_interview = new_interview.insert(&ctx.db).await.map_err(|error| {
        InterviewServiceError::Internal(format!("Failed to schedule interview: {error}"))
    })?;

    // Step 5: Sync the parent application's status to `interview_scheduled` if needed.
    if application_record.application_status != "interview_scheduled"
        && application_record.application_status != "selected"
    {
        let previous_status = application_record.application_status.clone();
        let application_id = application_record.id;
        let mut active_app: applications::ActiveModel = application_record.into();
        active_app.application_status = Set(String::from("interview_scheduled"));
        active_app.updated_at = Set(Utc::now().fixed_offset());
        let _ = active_app.update(&ctx.db).await;

        let round_label = if clean_round == "hr" {
            "HR"
        } else {
            "Technical"
        };
        let history_entry = application_status_history::ActiveModel {
            application_id: Set(application_id),
            previous_status: Set(Some(previous_status)),
            new_status: Set(String::from("interview_scheduled")),
            changed_by_user_id: Set(authenticated_user.user_id),
            status_note: Set(Some(format!(
                "{round_label} interview scheduled with {clean_interviewer_name}."
            ))),
            ..Default::default()
        };
        let _ = history_entry.insert(&ctx.db).await;
    }

    let response = build_interview_response(&ctx.db, created_interview).await?;

    // Notify the candidate that an interview has been scheduled.
    if let Ok(Some(candidate_record)) = candidates::Entity::find_by_id(response.candidate_id)
        .one(&ctx.db)
        .await
    {
        let round_label = if response.interview_round == "hr" {
            "HR"
        } else {
            "Technical"
        };
        let _ = notification_service::create_notification(
            &ctx.db,
            candidate_record.user_id,
            "interview_scheduled",
            format!("{round_label} Interview Scheduled — {}", response.job_title),
            format!(
                "Your {round_label} interview with {} for {} is scheduled.",
                response.interviewer_name, response.job_title
            ),
        )
        .await;
    }

    Ok(response)
}

/// LIST INTERVIEWS: Returns role-scoped interviews with support for `upcoming` and `results` scopes
/// plus filters for round, status, result, and application ID.
pub async fn list_interviews(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    filters: InterviewListFilters,
) -> Result<Vec<InterviewResponse>, InterviewServiceError> {
    let mut query = interviews::Entity::find();

    // Enforce strict role-based ownership scoping.
    match authenticated_user.user_role {
        UserRole::Recruiter => {
            let recruiter_profile = require_recruiter_profile(&ctx.db, authenticated_user).await?;
            query = query.filter(interviews::Column::RecruiterId.eq(recruiter_profile.id));
        }
        UserRole::Candidate => {
            let candidate_profile =
                match candidates::Model::find_by_user_id(&ctx.db, authenticated_user.user_id)
                    .await
                    .map_err(|error| {
                        InterviewServiceError::Internal(format!("Database lookup failed: {error}"))
                    })? {
                    Some(profile) => profile,
                    None => return Ok(vec![]),
                };

            let candidate_apps = applications::Entity::find()
                .filter(applications::Column::CandidateId.eq(candidate_profile.id))
                .all(&ctx.db)
                .await
                .map_err(|error| {
                    InterviewServiceError::Internal(format!(
                        "Failed to load candidate applications: {error}"
                    ))
                })?;

            let app_ids: Vec<i32> = candidate_apps.into_iter().map(|item| item.id).collect();
            if app_ids.is_empty() {
                return Ok(vec![]);
            }

            query = query.filter(interviews::Column::ApplicationId.is_in(app_ids));
        }
        UserRole::Admin => {
            // Admins can review all scheduled interviews across the platform.
        }
    }

    if let Some(app_id) = filters.application_id {
        query = query.filter(interviews::Column::ApplicationId.eq(app_id));
    }

    if let Some(round_filter) = filters.interview_round.as_deref().map(str::trim) {
        let normalized = round_filter.to_lowercase();
        if !normalized.is_empty() && VALID_INTERVIEW_ROUNDS.contains(&normalized.as_str()) {
            query = query.filter(interviews::Column::InterviewRound.eq(normalized));
        }
    }

    if let Some(status_filter) = filters.interview_status.as_deref().map(str::trim) {
        let normalized = status_filter.to_lowercase();
        if !normalized.is_empty() && VALID_INTERVIEW_STATUSES.contains(&normalized.as_str()) {
            query = query.filter(interviews::Column::InterviewStatus.eq(normalized));
        }
    }

    if let Some(result_filter) = filters.interview_result.as_deref().map(str::trim) {
        let normalized = result_filter.to_lowercase();
        if !normalized.is_empty() && VALID_INTERVIEW_RESULTS.contains(&normalized.as_str()) {
            query = query.filter(interviews::Column::InterviewResult.eq(normalized));
        }
    }

    let scope = filters
        .scope
        .as_deref()
        .map(|value| value.trim().to_lowercase())
        .unwrap_or_default();

    let records = match scope.as_str() {
        "upcoming" => {
            let now_timestamp = Utc::now().fixed_offset();
            query
                .filter(interviews::Column::ScheduledAt.gte(now_timestamp))
                .filter(interviews::Column::InterviewStatus.is_in(["scheduled", "rescheduled"]))
                .order_by_asc(interviews::Column::ScheduledAt)
                .all(&ctx.db)
                .await
        }
        "results" => {
            let results_condition = Condition::any()
                .add(interviews::Column::InterviewStatus.eq("completed"))
                .add(interviews::Column::InterviewResult.ne("pending"))
                .add(interviews::Column::InterviewFeedback.is_not_null());

            query
                .filter(results_condition)
                .order_by_desc(interviews::Column::UpdatedAt)
                .all(&ctx.db)
                .await
        }
        _ => {
            query
                .order_by_asc(interviews::Column::ScheduledAt)
                .all(&ctx.db)
                .await
        }
    }
    .map_err(|error| {
        InterviewServiceError::Internal(format!("Failed to list interviews: {error}"))
    })?;

    let mut responses = Vec::with_capacity(records.len());
    for record in records {
        responses.push(build_interview_response(&ctx.db, record).await?);
    }

    Ok(responses)
}

/// READ (Single): Returns full details for one interview after verifying participant/recruiter/admin access.
pub async fn get_interview_by_id(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    interview_id: i32,
) -> Result<InterviewResponse, InterviewServiceError> {
    let interview_record = interviews::Entity::find_by_id(interview_id)
        .one(&ctx.db)
        .await
        .map_err(|error| {
            InterviewServiceError::Internal(format!("Failed to load interview: {error}"))
        })?
        .ok_or_else(|| {
            InterviewServiceError::NotFound(String::from("Interview record was not found."))
        })?;

    match authenticated_user.user_role {
        UserRole::Recruiter => {
            let recruiter_profile = require_recruiter_profile(&ctx.db, authenticated_user).await?;
            if interview_record.recruiter_id != recruiter_profile.id {
                return Err(InterviewServiceError::Forbidden(String::from(
                    "You can only view interviews for your own job openings.",
                )));
            }
        }
        UserRole::Candidate => {
            let candidate_profile =
                candidates::Model::find_by_user_id(&ctx.db, authenticated_user.user_id)
                    .await
                    .map_err(|error| {
                        InterviewServiceError::Internal(format!("Database lookup failed: {error}"))
                    })?
                    .ok_or_else(|| {
                        InterviewServiceError::Forbidden(String::from(
                            "Candidate profile not found.",
                        ))
                    })?;

            let application_record =
                applications::Entity::find_by_id(interview_record.application_id)
                    .one(&ctx.db)
                    .await
                    .map_err(|error| {
                        InterviewServiceError::Internal(format!(
                            "Failed to load application: {error}"
                        ))
                    })?
                    .ok_or_else(|| {
                        InterviewServiceError::NotFound(String::from(
                            "Associated application not found.",
                        ))
                    })?;

            if application_record.candidate_id != candidate_profile.id {
                return Err(InterviewServiceError::Forbidden(String::from(
                    "You can only view your own scheduled interviews.",
                )));
            }
        }
        UserRole::Admin => {}
    }

    build_interview_response(&ctx.db, interview_record).await
}

/// UPDATE / RESCHEDULE (Owning Recruiter only): Updates interview timing, interviewer details, round, mode, or status.
pub async fn update_interview(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    interview_id: i32,
    input: UpdateInterviewInput,
) -> Result<InterviewResponse, InterviewServiceError> {
    let recruiter_profile = require_recruiter_profile(&ctx.db, authenticated_user).await?;

    let existing_interview = interviews::Entity::find_by_id(interview_id)
        .one(&ctx.db)
        .await
        .map_err(|error| {
            InterviewServiceError::Internal(format!("Failed to load interview: {error}"))
        })?
        .ok_or_else(|| {
            InterviewServiceError::NotFound(String::from("Interview record was not found."))
        })?;

    if existing_interview.recruiter_id != recruiter_profile.id {
        return Err(InterviewServiceError::Forbidden(String::from(
            "You do not have permission to edit another recruiter's interview.",
        )));
    }

    let clean_status = input.interview_status.trim().to_lowercase();
    if !VALID_INTERVIEW_STATUSES.contains(&clean_status.as_str()) {
        return Err(InterviewServiceError::Validation(String::from(
            "Interview status must be one of: scheduled, rescheduled, completed, or cancelled.",
        )));
    }

    // Require future date when scheduling or rescheduling an active interview.
    let requires_future_date = clean_status == "scheduled" || clean_status == "rescheduled";
    let scheduled_timestamp =
        parse_and_validate_interview_date(&input.interview_date, requires_future_date)?;

    let (clean_interviewer_name, clean_interviewer_email, clean_round, clean_mode) =
        validate_schedule_fields(
            &input.interviewer_name,
            input.interviewer_email,
            &input.interview_round,
            input.duration_minutes,
            &input.interview_mode,
        )?;

    let clean_meeting_link = input
        .meeting_link
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let clean_notes = input
        .interviewer_notes
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    let mut active_interview: interviews::ActiveModel = existing_interview.into();
    active_interview.interviewer_name = Set(clean_interviewer_name);
    active_interview.interviewer_email = Set(clean_interviewer_email);
    active_interview.interview_round = Set(clean_round);
    active_interview.scheduled_at = Set(scheduled_timestamp);
    active_interview.duration_minutes = Set(input.duration_minutes);
    active_interview.interview_mode = Set(clean_mode);
    active_interview.meeting_link = Set(clean_meeting_link);
    active_interview.interview_status = Set(clean_status);
    active_interview.interviewer_notes = Set(clean_notes);
    active_interview.updated_at = Set(Utc::now().fixed_offset());

    let updated_interview = active_interview.update(&ctx.db).await.map_err(|error| {
        InterviewServiceError::Internal(format!("Failed to update interview: {error}"))
    })?;

    let response = build_interview_response(&ctx.db, updated_interview).await?;

    // Notify the candidate when their interview schedule or status is updated.
    if let Ok(Some(candidate_record)) = candidates::Entity::find_by_id(response.candidate_id)
        .one(&ctx.db)
        .await
    {
        let _ = notification_service::create_notification(
            &ctx.db,
            candidate_record.user_id,
            "interview_updated",
            format!("Interview Updated — {}", response.job_title),
            format!(
                "Your {} interview status is now '{}'.",
                response.job_title, response.interview_status
            ),
        )
        .await;
    }

    Ok(response)
}

/// RECORD FEEDBACK & RESULT (Owning Recruiter only): Saves structured interviewer feedback,
/// optional 1-5 rating, and final round result (`passed`, `failed`, `on_hold`, `pending`).
pub async fn record_interview_feedback(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
    interview_id: i32,
    input: RecordInterviewFeedbackInput,
) -> Result<InterviewResponse, InterviewServiceError> {
    let recruiter_profile = require_recruiter_profile(&ctx.db, authenticated_user).await?;

    let existing_interview = interviews::Entity::find_by_id(interview_id)
        .one(&ctx.db)
        .await
        .map_err(|error| {
            InterviewServiceError::Internal(format!("Failed to load interview: {error}"))
        })?
        .ok_or_else(|| {
            InterviewServiceError::NotFound(String::from("Interview record was not found."))
        })?;

    if existing_interview.recruiter_id != recruiter_profile.id {
        return Err(InterviewServiceError::Forbidden(String::from(
            "You do not have permission to record feedback for another recruiter's interview.",
        )));
    }

    let clean_feedback = input.interview_feedback.trim().to_string();
    if clean_feedback.len() < 5 {
        return Err(InterviewServiceError::Validation(String::from(
            "Interview feedback must be at least 5 characters long.",
        )));
    }

    if let Some(rating) = input.interview_rating {
        if !(1..=5).contains(&rating) {
            return Err(InterviewServiceError::Validation(String::from(
                "Interview rating must be between 1 and 5.",
            )));
        }
    }

    let clean_result = input.interview_result.trim().to_lowercase();
    if !VALID_INTERVIEW_RESULTS.contains(&clean_result.as_str()) {
        return Err(InterviewServiceError::Validation(String::from(
            "Interview result must be one of: pending, passed, failed, or on_hold.",
        )));
    }

    let next_status = match input.interview_status.as_deref().map(str::trim) {
        Some(raw_status) if !raw_status.is_empty() => {
            let normalized = raw_status.to_lowercase();
            if !VALID_INTERVIEW_STATUSES.contains(&normalized.as_str()) {
                return Err(InterviewServiceError::Validation(String::from(
                    "Invalid interview status.",
                )));
            }
            normalized
        }
        _ => {
            // Automatically mark the interview completed once a non-pending outcome is recorded.
            if clean_result != "pending" {
                String::from("completed")
            } else {
                existing_interview.interview_status.clone()
            }
        }
    };

    let now_timestamp = Utc::now().fixed_offset();
    let mut active_interview: interviews::ActiveModel = existing_interview.into();
    active_interview.interview_feedback = Set(Some(clean_feedback));
    active_interview.interview_rating = Set(input.interview_rating);
    active_interview.interview_result = Set(clean_result);
    active_interview.interview_status = Set(next_status);
    active_interview.feedback_submitted_at = Set(Some(now_timestamp));
    active_interview.updated_at = Set(now_timestamp);

    let updated_interview = active_interview.update(&ctx.db).await.map_err(|error| {
        InterviewServiceError::Internal(format!("Failed to record interview feedback: {error}"))
    })?;

    let response = build_interview_response(&ctx.db, updated_interview).await?;

    // Notify the candidate when interview feedback and outcome have been recorded.
    if let Ok(Some(candidate_record)) = candidates::Entity::find_by_id(response.candidate_id)
        .one(&ctx.db)
        .await
    {
        let result_label = response.interview_result.replace('_', " ");
        let _ = notification_service::create_notification(
            &ctx.db,
            candidate_record.user_id,
            "interview_result",
            format!("Interview Result Posted — {}", response.job_title),
            format!(
                "Feedback has been recorded for your {} interview (result: {}).",
                response.job_title, result_label
            ),
        )
        .await;
    }

    Ok(response)
}
