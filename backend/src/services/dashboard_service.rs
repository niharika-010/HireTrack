use std::collections::{HashMap, HashSet};

use chrono::Utc;
use loco_rs::app::AppContext;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use serde::{Deserialize, Serialize};

use crate::{
    middleware::auth::AuthenticatedUser,
    models::{applications, candidates, interviews, jobs, notifications, recruiters, users},
    services::{
        application_service::VALID_APPLICATION_STATUSES,
        auth_service::UserRole,
    },
};

/// Count bucket for one of the 6 official application lifecycle statuses.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusCountItem {
    pub status: String,
    pub label: String,
    pub count: usize,
}

/// Generic label/count pair used for recruitment charts (jobs by department, applications per job).
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryCountItem {
    pub label: String,
    pub count: usize,
}

/// Compact upcoming interview item rendered inside dashboard widgets.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardUpcomingInterview {
    pub interview_id: i32,
    pub application_id: i32,
    pub job_title: String,
    pub candidate_name: String,
    pub interviewer_name: String,
    pub interview_round: String,
    pub interview_date: String,
    pub interview_mode: String,
    pub interview_status: String,
}

/// Platform-wide analytics payload returned by GET /api/dashboard/admin (Admin only).
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminDashboardResponse {
    pub active_jobs_count: usize,
    pub total_jobs_count: usize,
    pub total_candidates_count: usize,
    pub total_recruiters_count: usize,
    pub total_applications_count: usize,
    pub upcoming_interviews_count: usize,
    pub unread_notifications_count: usize,
    pub application_counts_by_status: Vec<StatusCountItem>,
    pub jobs_by_department: Vec<CategoryCountItem>,
    pub upcoming_interviews: Vec<DashboardUpcomingInterview>,
}

/// Recruiter-scoped analytics payload returned by GET /api/dashboard/recruiter (Recruiter only).
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecruiterDashboardResponse {
    pub active_jobs_count: usize,
    pub total_jobs_count: usize,
    pub total_candidates_count: usize,
    pub total_applications_count: usize,
    pub upcoming_interviews_count: usize,
    pub unread_notifications_count: usize,
    pub application_counts_by_status: Vec<StatusCountItem>,
    pub applications_by_job: Vec<CategoryCountItem>,
    pub upcoming_interviews: Vec<DashboardUpcomingInterview>,
}

/// Candidate-scoped analytics payload returned by GET /api/dashboard/candidate (Candidate only).
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CandidateDashboardResponse {
    pub active_jobs_count: usize,
    pub total_applications_count: usize,
    pub shortlisted_or_advanced_count: usize,
    pub upcoming_interviews_count: usize,
    pub unread_notifications_count: usize,
    pub application_counts_by_status: Vec<StatusCountItem>,
    pub upcoming_interviews: Vec<DashboardUpcomingInterview>,
}

/// Errors returned by dashboard analytics queries.
#[derive(Debug)]
pub enum DashboardServiceError {
    Forbidden(String),
    Internal(String),
}

fn format_status_label(status_code: &str) -> &'static str {
    match status_code {
        "applied" => "Applied",
        "under_review" => "Under Review",
        "shortlisted" => "Shortlisted",
        "interview_scheduled" => "Interview Scheduled",
        "selected" => "Selected",
        "rejected" => "Rejected",
        _ => "Unknown",
    }
}

/// Tallies application rows into the 6 official status buckets in consistent pipeline order.
fn calculate_application_counts_by_status(
    application_records: &[applications::Model],
) -> Vec<StatusCountItem> {
    let mut counts_by_status: HashMap<&str, usize> = HashMap::new();

    for record in application_records {
        let status_key = record.application_status.as_str();
        *counts_by_status.entry(status_key).or_insert(0) += 1;
    }

    VALID_APPLICATION_STATUSES
        .iter()
        .map(|status_code| StatusCountItem {
            status: (*status_code).to_string(),
            label: format_status_label(status_code).to_string(),
            count: *counts_by_status.get(status_code).unwrap_or(&0),
        })
        .collect()
}

/// Maps upcoming `interviews::Model` rows into lightweight dashboard cards with job and candidate names.
async fn build_upcoming_interview_cards(
    ctx: &AppContext,
    interview_records: Vec<interviews::Model>,
) -> Result<Vec<DashboardUpcomingInterview>, DashboardServiceError> {
    if interview_records.is_empty() {
        return Ok(vec![]);
    }

    let all_apps = applications::Entity::find()
        .all(&ctx.db)
        .await
        .map_err(|error| DashboardServiceError::Internal(format!("DB error: {error}")))?;
    let all_jobs = jobs::Entity::find()
        .all(&ctx.db)
        .await
        .map_err(|error| DashboardServiceError::Internal(format!("DB error: {error}")))?;
    let all_candidates = candidates::Entity::find()
        .all(&ctx.db)
        .await
        .map_err(|error| DashboardServiceError::Internal(format!("DB error: {error}")))?;
    let all_users = users::Entity::find()
        .all(&ctx.db)
        .await
        .map_err(|error| DashboardServiceError::Internal(format!("DB error: {error}")))?;

    let app_map: HashMap<i32, &applications::Model> =
        all_apps.iter().map(|item| (item.id, item)).collect();
    let job_title_map: HashMap<i32, &str> = all_jobs
        .iter()
        .map(|item| (item.id, item.job_title.as_str()))
        .collect();
    let cand_user_map: HashMap<i32, i32> = all_candidates
        .iter()
        .map(|item| (item.id, item.user_id))
        .collect();
    let user_name_map: HashMap<i32, &str> = all_users
        .iter()
        .map(|item| (item.id, item.full_name.as_str()))
        .collect();

    let cards = interview_records
        .into_iter()
        .take(5)
        .map(|record| {
            let linked_app = app_map.get(&record.application_id).copied();
            let job_title = linked_app
                .and_then(|app| job_title_map.get(&app.job_id).copied())
                .unwrap_or("Job Opening")
                .to_string();
            let candidate_name = linked_app
                .and_then(|app| cand_user_map.get(&app.candidate_id).copied())
                .and_then(|uid| user_name_map.get(&uid).copied())
                .unwrap_or("Candidate")
                .to_string();

            DashboardUpcomingInterview {
                interview_id: record.id,
                application_id: record.application_id,
                job_title,
                candidate_name,
                interviewer_name: record.interviewer_name,
                interview_round: record.interview_round,
                interview_date: record.scheduled_at.to_rfc3339(),
                interview_mode: record.interview_mode,
                interview_status: record.interview_status,
            }
        })
        .collect();

    Ok(cards)
}

/// Counts unread notifications for a user directly from PostgreSQL.
async fn count_unread_notifications(
    ctx: &AppContext,
    user_id: i32,
) -> Result<usize, DashboardServiceError> {
    let unread = notifications::Model::list_unread_for_user(&ctx.db, user_id)
        .await
        .map_err(|error| {
            DashboardServiceError::Internal(format!("Failed to count notifications: {error}"))
        })?;
    Ok(unread.len())
}

/// ADMIN DASHBOARD ANALYTICS: Computes platform-wide job, candidate, recruiter, application, and interview metrics.
pub async fn get_admin_dashboard_stats(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
) -> Result<AdminDashboardResponse, DashboardServiceError> {
    if authenticated_user.user_role != UserRole::Admin {
        return Err(DashboardServiceError::Forbidden(String::from(
            "Only administrators can access platform-wide dashboard analytics.",
        )));
    }

    let all_jobs = jobs::Entity::find()
        .all(&ctx.db)
        .await
        .map_err(|error| DashboardServiceError::Internal(format!("Failed to load jobs: {error}")))?;
    let all_candidates = candidates::Entity::find()
        .all(&ctx.db)
        .await
        .map_err(|error| {
            DashboardServiceError::Internal(format!("Failed to load candidates: {error}"))
        })?;
    let all_recruiters = recruiters::Entity::find()
        .all(&ctx.db)
        .await
        .map_err(|error| {
            DashboardServiceError::Internal(format!("Failed to load recruiters: {error}"))
        })?;
    let all_applications = applications::Entity::find()
        .all(&ctx.db)
        .await
        .map_err(|error| {
            DashboardServiceError::Internal(format!("Failed to load applications: {error}"))
        })?;

    // Active jobs are openings whose status is currently `open`.
    let active_jobs_count = all_jobs
        .iter()
        .filter(|job| job.job_status == "open")
        .count();

    // Group jobs by department for the admin recruitment distribution chart.
    let mut department_counts: HashMap<String, usize> = HashMap::new();
    for job in &all_jobs {
        *department_counts.entry(job.department.clone()).or_insert(0) += 1;
    }
    let mut jobs_by_department: Vec<CategoryCountItem> = department_counts
        .into_iter()
        .map(|(label, count)| CategoryCountItem { label, count })
        .collect();
    jobs_by_department.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.label.cmp(&b.label)));

    // Upcoming interviews are future interviews in `scheduled` or `rescheduled` state.
    let now_timestamp = Utc::now().fixed_offset();
    let upcoming_records = interviews::Entity::find()
        .filter(interviews::Column::ScheduledAt.gte(now_timestamp))
        .filter(interviews::Column::InterviewStatus.is_in(["scheduled", "rescheduled"]))
        .order_by_asc(interviews::Column::ScheduledAt)
        .all(&ctx.db)
        .await
        .map_err(|error| {
            DashboardServiceError::Internal(format!("Failed to load upcoming interviews: {error}"))
        })?;

    let upcoming_interviews_count = upcoming_records.len();
    let upcoming_interviews = build_upcoming_interview_cards(ctx, upcoming_records).await?;
    let unread_notifications_count =
        count_unread_notifications(ctx, authenticated_user.user_id).await?;

    Ok(AdminDashboardResponse {
        active_jobs_count,
        total_jobs_count: all_jobs.len(),
        total_candidates_count: all_candidates.len(),
        total_recruiters_count: all_recruiters.len(),
        total_applications_count: all_applications.len(),
        upcoming_interviews_count,
        unread_notifications_count,
        application_counts_by_status: calculate_application_counts_by_status(&all_applications),
        jobs_by_department,
        upcoming_interviews,
    })
}

/// RECRUITER DASHBOARD ANALYTICS: Computes statistics scoped strictly to the logged-in recruiter's jobs.
pub async fn get_recruiter_dashboard_stats(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
) -> Result<RecruiterDashboardResponse, DashboardServiceError> {
    if authenticated_user.user_role != UserRole::Recruiter {
        return Err(DashboardServiceError::Forbidden(String::from(
            "Only recruiter accounts can access recruiter dashboard analytics.",
        )));
    }

    let recruiter_profile =
        recruiters::Model::find_by_user_id(&ctx.db, authenticated_user.user_id)
            .await
            .map_err(|error| DashboardServiceError::Internal(format!("DB error: {error}")))?
            .ok_or_else(|| {
                DashboardServiceError::Forbidden(String::from("Recruiter profile not found."))
            })?;

    let my_jobs = jobs::Model::list_by_recruiter(&ctx.db, recruiter_profile.id)
        .await
        .map_err(|error| DashboardServiceError::Internal(format!("Failed to load jobs: {error}")))?;

    let active_jobs_count = my_jobs
        .iter()
        .filter(|job| job.job_status == "open")
        .count();

    let owned_job_ids: Vec<i32> = my_jobs.iter().map(|job| job.id).collect();
    let my_applications = if owned_job_ids.is_empty() {
        vec![]
    } else {
        applications::Entity::find()
            .filter(applications::Column::JobId.is_in(owned_job_ids))
            .all(&ctx.db)
            .await
            .map_err(|error| {
                DashboardServiceError::Internal(format!("Failed to load applications: {error}"))
            })?
    };

    // Count distinct candidates who have applied across this recruiter's openings.
    let unique_candidate_ids: HashSet<i32> = my_applications
        .iter()
        .map(|application| application.candidate_id)
        .collect();

    // Calculate application volume per job for the recruiter bar chart.
    let mut count_by_job_id: HashMap<i32, usize> = HashMap::new();
    for application in &my_applications {
        *count_by_job_id.entry(application.job_id).or_insert(0) += 1;
    }
    let mut applications_by_job: Vec<CategoryCountItem> = my_jobs
        .iter()
        .map(|job| CategoryCountItem {
            label: job.job_title.clone(),
            count: *count_by_job_id.get(&job.id).unwrap_or(&0),
        })
        .collect();
    applications_by_job.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.label.cmp(&b.label)));

    let now_timestamp = Utc::now().fixed_offset();
    let upcoming_records = interviews::Entity::find()
        .filter(interviews::Column::RecruiterId.eq(recruiter_profile.id))
        .filter(interviews::Column::ScheduledAt.gte(now_timestamp))
        .filter(interviews::Column::InterviewStatus.is_in(["scheduled", "rescheduled"]))
        .order_by_asc(interviews::Column::ScheduledAt)
        .all(&ctx.db)
        .await
        .map_err(|error| {
            DashboardServiceError::Internal(format!("Failed to load upcoming interviews: {error}"))
        })?;

    let upcoming_interviews_count = upcoming_records.len();
    let upcoming_interviews = build_upcoming_interview_cards(ctx, upcoming_records).await?;
    let unread_notifications_count =
        count_unread_notifications(ctx, authenticated_user.user_id).await?;

    Ok(RecruiterDashboardResponse {
        active_jobs_count,
        total_jobs_count: my_jobs.len(),
        total_candidates_count: unique_candidate_ids.len(),
        total_applications_count: my_applications.len(),
        upcoming_interviews_count,
        unread_notifications_count,
        application_counts_by_status: calculate_application_counts_by_status(&my_applications),
        applications_by_job,
        upcoming_interviews,
    })
}

/// CANDIDATE DASHBOARD ANALYTICS: Computes statistics scoped strictly to the logged-in candidate.
pub async fn get_candidate_dashboard_stats(
    ctx: &AppContext,
    authenticated_user: &AuthenticatedUser,
) -> Result<CandidateDashboardResponse, DashboardServiceError> {
    if authenticated_user.user_role != UserRole::Candidate {
        return Err(DashboardServiceError::Forbidden(String::from(
            "Only candidate accounts can access candidate dashboard analytics.",
        )));
    }

    // Active jobs available on the platform for the candidate to browse.
    let active_jobs = jobs::Entity::find()
        .filter(jobs::Column::JobStatus.eq("open"))
        .all(&ctx.db)
        .await
        .map_err(|error| DashboardServiceError::Internal(format!("Failed to load jobs: {error}")))?;

    let candidate_profile =
        candidates::Model::find_by_user_id(&ctx.db, authenticated_user.user_id)
            .await
            .map_err(|error| DashboardServiceError::Internal(format!("DB error: {error}")))?;

    let my_applications = match candidate_profile {
        Some(profile) => applications::Entity::find()
            .filter(applications::Column::CandidateId.eq(profile.id))
            .all(&ctx.db)
            .await
            .map_err(|error| {
                DashboardServiceError::Internal(format!("Failed to load applications: {error}"))
            })?,
        None => vec![],
    };

    let shortlisted_or_advanced_count = my_applications
        .iter()
        .filter(|app| {
            matches!(
                app.application_status.as_str(),
                "shortlisted" | "interview_scheduled" | "selected"
            )
        })
        .count();

    let my_app_ids: Vec<i32> = my_applications.iter().map(|app| app.id).collect();
    let upcoming_records = if my_app_ids.is_empty() {
        vec![]
    } else {
        let now_timestamp = Utc::now().fixed_offset();
        interviews::Entity::find()
            .filter(interviews::Column::ApplicationId.is_in(my_app_ids))
            .filter(interviews::Column::ScheduledAt.gte(now_timestamp))
            .filter(interviews::Column::InterviewStatus.is_in(["scheduled", "rescheduled"]))
            .order_by_asc(interviews::Column::ScheduledAt)
            .all(&ctx.db)
            .await
            .map_err(|error| {
                DashboardServiceError::Internal(format!(
                    "Failed to load upcoming interviews: {error}"
                ))
            })?
    };

    let upcoming_interviews_count = upcoming_records.len();
    let upcoming_interviews = build_upcoming_interview_cards(ctx, upcoming_records).await?;
    let unread_notifications_count =
        count_unread_notifications(ctx, authenticated_user.user_id).await?;

    Ok(CandidateDashboardResponse {
        active_jobs_count: active_jobs.len(),
        total_applications_count: my_applications.len(),
        shortlisted_or_advanced_count,
        upcoming_interviews_count,
        unread_notifications_count,
        application_counts_by_status: calculate_application_counts_by_status(&my_applications),
        upcoming_interviews,
    })
}
