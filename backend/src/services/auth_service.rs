use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{DateTime, Duration, FixedOffset, Utc};
use hmac::{Hmac, Mac};
use loco_rs::{app::AppContext, hash};
use sea_orm::{ActiveModelTrait, DatabaseConnection, Set};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use uuid::Uuid;

use crate::models::{candidates, recruiters, revoked_tokens, users};

type HmacSha256 = Hmac<Sha256>;

/// Supported user roles across the HireTrack Recruitment Management System.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    Recruiter,
    Candidate,
}

impl UserRole {
    /// Parses a role string (case-insensitive) into a typed `UserRole`.
    pub fn parse_role(raw_role: &str) -> Option<Self> {
        match raw_role.trim().to_lowercase().as_str() {
            "admin" => Some(Self::Admin),
            "recruiter" => Some(Self::Recruiter),
            "candidate" => Some(Self::Candidate),
            _ => None,
        }
    }

    /// Converts the role enum to its canonical lowercase database value.
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Admin => "admin",
            Self::Recruiter => "recruiter",
            Self::Candidate => "candidate",
        }
    }
}

/// Safe public representation of a user returned in API responses (never includes `password_hash`).
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicUserProfile {
    pub user_id: i32,
    pub full_name: String,
    pub user_email: String,
    pub user_role: String,
    pub is_active: bool,
}

impl From<&users::Model> for PublicUserProfile {
    fn from(user_record: &users::Model) -> Self {
        Self {
            user_id: user_record.id,
            full_name: user_record.full_name.clone(),
            user_email: user_record.email.clone(),
            user_role: user_record.role.clone(),
            is_active: user_record.is_active,
        }
    }
}

/// Standard JWT header specifying HMAC-SHA256 signing.
#[derive(Debug, Serialize, Deserialize)]
struct JwtHeader {
    alg: String,
    typ: String,
}

/// Claims embedded inside each HireTrack JWT payload.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct JwtClaims {
    /// Subject: the unique user ID in PostgreSQL.
    pub sub: i32,
    /// User's normalized email address.
    pub email: String,
    /// User's role (`admin`, `recruiter`, or `candidate`).
    pub role: String,
    /// Unique JWT ID (UUID v4) used to revoke individual tokens on logout.
    pub jti: String,
    /// Issued-at Unix timestamp (seconds).
    pub iat: i64,
    /// Expiration Unix timestamp (seconds).
    pub exp: i64,
}

/// Input parameters required to register a new HireTrack user.
#[derive(Debug)]
pub struct RegistrationInput {
    pub full_name: String,
    pub user_email: String,
    pub user_password: String,
    pub user_role: String,
    pub company_name: Option<String>,
}

/// Input parameters required to log in an existing HireTrack user.
#[derive(Debug)]
pub struct LoginInput {
    pub user_email: String,
    pub user_password: String,
}

/// Structured domain errors returned by authentication service functions.
#[derive(Debug)]
pub enum AuthServiceError {
    Validation(String),
    DuplicateEmail(String),
    InvalidCredentials(String),
    Unauthorized(String),
    Internal(String),
}

/// Reads the JWT signing secret and expiration duration from Loco's configuration.
/// The secret is sourced from `JWT_SECRET` in the server environment and never exposed to the frontend.
pub fn load_jwt_settings(ctx: &AppContext) -> Result<(String, u64), AuthServiceError> {
    if let Some(auth_config) = &ctx.config.auth {
        if let Some(jwt_config) = &auth_config.jwt {
            let trimmed_secret = jwt_config.secret.trim();
            if !trimmed_secret.is_empty() {
                return Ok((trimmed_secret.to_string(), jwt_config.expiration));
            }
        }
    }

    Err(AuthServiceError::Internal(String::from(
        "JWT configuration is missing on the server",
    )))
}

/// Hashes a plain-text password with Argon2id and a unique random salt.
pub fn hash_user_password(plain_password: &str) -> Result<String, AuthServiceError> {
    hash::hash_password(plain_password)
        .map_err(|_| AuthServiceError::Internal(String::from("Failed to hash password")))
}

/// Verifies a plain-text password against a stored Argon2id hash.
pub fn verify_user_password(plain_password: &str, stored_password_hash: &str) -> bool {
    hash::verify_password(plain_password, stored_password_hash)
}

/// Generates a signed HS256 JWT containing user identity, role, unique token ID (`jti`), and expiry.
pub fn generate_jwt_token(
    user_record: &users::Model,
    jwt_secret: &str,
    expiration_seconds: u64,
) -> Result<(String, JwtClaims), AuthServiceError> {
    let issued_at = Utc::now();
    let expires_at = issued_at + Duration::seconds(expiration_seconds as i64);

    let header = JwtHeader {
        alg: String::from("HS256"),
        typ: String::from("JWT"),
    };

    let claims = JwtClaims {
        sub: user_record.id,
        email: user_record.email.clone(),
        role: user_record.role.clone(),
        jti: Uuid::new_v4().to_string(),
        iat: issued_at.timestamp(),
        exp: expires_at.timestamp(),
    };

    let header_json = serde_json::to_vec(&header)
        .map_err(|_| AuthServiceError::Internal(String::from("Failed to serialize JWT header")))?;
    let claims_json = serde_json::to_vec(&claims)
        .map_err(|_| AuthServiceError::Internal(String::from("Failed to serialize JWT claims")))?;

    let encoded_header = URL_SAFE_NO_PAD.encode(header_json);
    let encoded_payload = URL_SAFE_NO_PAD.encode(claims_json);
    let signing_input = format!("{encoded_header}.{encoded_payload}");

    // Sign `header.payload` using HMAC-SHA256 and the server-side JWT secret.
    let mut signer = HmacSha256::new_from_slice(jwt_secret.as_bytes())
        .map_err(|_| AuthServiceError::Internal(String::from("Invalid JWT secret key")))?;
    signer.update(signing_input.as_bytes());
    let signature_bytes = signer.finalize().into_bytes();
    let encoded_signature = URL_SAFE_NO_PAD.encode(signature_bytes);

    let signed_token = format!("{signing_input}.{encoded_signature}");
    Ok((signed_token, claims))
}

/// Validates a JWT's structure, HS256 signature, and expiration timestamp.
pub fn verify_jwt_token(raw_token: &str, jwt_secret: &str) -> Result<JwtClaims, AuthServiceError> {
    let token_parts: Vec<&str> = raw_token.split('.').collect();
    if token_parts.len() != 3 {
        return Err(AuthServiceError::Unauthorized(String::from(
            "Malformed authentication token",
        )));
    }

    let encoded_header = token_parts[0];
    let encoded_payload = token_parts[1];
    let encoded_signature = token_parts[2];

    // Step 1: Decode and verify that the token explicitly uses HS256 (prevents algorithm downgrade attacks).
    let header_bytes = URL_SAFE_NO_PAD.decode(encoded_header).map_err(|_| {
        AuthServiceError::Unauthorized(String::from("Invalid authentication token header"))
    })?;
    let header: JwtHeader = serde_json::from_slice(&header_bytes).map_err(|_| {
        AuthServiceError::Unauthorized(String::from("Invalid authentication token header"))
    })?;
    if header.alg != "HS256" {
        return Err(AuthServiceError::Unauthorized(String::from(
            "Unsupported JWT signing algorithm",
        )));
    }

    // Step 2: Verify the HMAC-SHA256 signature in constant time.
    let provided_signature = URL_SAFE_NO_PAD.decode(encoded_signature).map_err(|_| {
        AuthServiceError::Unauthorized(String::from("Invalid authentication token signature"))
    })?;
    let signing_input = format!("{encoded_header}.{encoded_payload}");
    let mut verifier = HmacSha256::new_from_slice(jwt_secret.as_bytes())
        .map_err(|_| AuthServiceError::Internal(String::from("Invalid JWT secret key")))?;
    verifier.update(signing_input.as_bytes());
    verifier.verify_slice(&provided_signature).map_err(|_| {
        AuthServiceError::Unauthorized(String::from("Invalid authentication token signature"))
    })?;

    // Step 3: Decode claims and confirm the token has not expired.
    let payload_bytes = URL_SAFE_NO_PAD.decode(encoded_payload).map_err(|_| {
        AuthServiceError::Unauthorized(String::from("Invalid authentication token payload"))
    })?;
    let claims: JwtClaims = serde_json::from_slice(&payload_bytes).map_err(|_| {
        AuthServiceError::Unauthorized(String::from("Invalid authentication token payload"))
    })?;

    let current_timestamp = Utc::now().timestamp();
    if claims.exp <= current_timestamp {
        return Err(AuthServiceError::Unauthorized(String::from(
            "Authentication token has expired. Please log in again.",
        )));
    }

    Ok(claims)
}

/// Validates email format with simple, readable checks suitable for registration and login.
fn is_valid_email_format(user_email: &str) -> bool {
    let trimmed_email = user_email.trim();
    if trimmed_email.len() < 5 || trimmed_email.contains(' ') {
        return false;
    }

    let parts: Vec<&str> = trimmed_email.split('@').collect();
    if parts.len() != 2 {
        return false;
    }

    let local_part = parts[0];
    let domain_part = parts[1];
    !local_part.is_empty() && domain_part.contains('.') && !domain_part.starts_with('.') && !domain_part.ends_with('.')
}

/// Creates a matching role profile row in `candidates` or `recruiters` when a user registers.
async fn create_role_profile_if_needed(
    database: &DatabaseConnection,
    created_user: &users::Model,
    parsed_role: UserRole,
    company_name: Option<String>,
) -> Result<(), AuthServiceError> {
    match parsed_role {
        UserRole::Candidate => {
            let candidate_profile = candidates::ActiveModel {
                user_id: Set(created_user.id),
                years_of_experience: Set(0),
                ..Default::default()
            };
            candidate_profile
                .insert(database)
                .await
                .map_err(|error| AuthServiceError::Internal(format!("Failed to create candidate profile: {error}")))?;
        }
        UserRole::Recruiter => {
            let resolved_company = company_name
                .map(|name| name.trim().to_string())
                .filter(|name| !name.is_empty())
                .unwrap_or_else(|| String::from("HireTrack Partner Company"));

            let recruiter_profile = recruiters::ActiveModel {
                user_id: Set(created_user.id),
                company_name: Set(resolved_company),
                ..Default::default()
            };
            recruiter_profile
                .insert(database)
                .await
                .map_err(|error| AuthServiceError::Internal(format!("Failed to create recruiter profile: {error}")))?;
        }
        UserRole::Admin => {
            // Admin accounts do not require a separate candidate or recruiter profile row.
        }
    }

    Ok(())
}

/// Registers a new user, hashes their password securely, creates their role profile, and returns a JWT.
pub async fn register_user(
    ctx: &AppContext,
    input: RegistrationInput,
) -> Result<(PublicUserProfile, String), AuthServiceError> {
    let clean_full_name = input.full_name.trim().to_string();
    let normalized_email = input.user_email.trim().to_lowercase();

    // Step 1: Validate all registration fields before touching the database.
    if clean_full_name.len() < 2 {
        return Err(AuthServiceError::Validation(String::from(
            "Full name must be at least 2 characters long.",
        )));
    }

    if !is_valid_email_format(&normalized_email) {
        return Err(AuthServiceError::Validation(String::from(
            "Please provide a valid email address.",
        )));
    }

    if input.user_password.len() < 8 {
        return Err(AuthServiceError::Validation(String::from(
            "Password must be at least 8 characters long.",
        )));
    }

    let parsed_role = UserRole::parse_role(&input.user_role).ok_or_else(|| {
        AuthServiceError::Validation(String::from(
            "Role must be one of: admin, recruiter, or candidate.",
        ))
    })?;

    // Step 2: Reject duplicate email addresses clearly before insert.
    let existing_user = users::Model::find_by_email(&ctx.db, &normalized_email)
        .await
        .map_err(|error| AuthServiceError::Internal(format!("Database lookup failed: {error}")))?;

    if existing_user.is_some() {
        return Err(AuthServiceError::DuplicateEmail(String::from(
            "An account with this email address already exists.",
        )));
    }

    // Step 3: Hash the password with Argon2id — never store plain-text passwords.
    let password_hash = hash_user_password(&input.user_password)?;

    // Step 4: Save the user record in PostgreSQL.
    let new_user = users::ActiveModel {
        full_name: Set(clean_full_name),
        email: Set(normalized_email),
        password_hash: Set(password_hash),
        role: Set(parsed_role.as_str().to_string()),
        is_active: Set(true),
        ..Default::default()
    };

    let created_user = new_user
        .insert(&ctx.db)
        .await
        .map_err(|error| AuthServiceError::Internal(format!("Failed to create user: {error}")))?;

    // Step 5: Create the corresponding candidate or recruiter profile record.
    create_role_profile_if_needed(&ctx.db, &created_user, parsed_role, input.company_name).await?;

    // Step 6: Sign and return a fresh JWT for the newly registered user.
    let (jwt_secret, expiration_seconds) = load_jwt_settings(ctx)?;
    let (auth_token, _claims) =
        generate_jwt_token(&created_user, &jwt_secret, expiration_seconds)?;

    Ok((PublicUserProfile::from(&created_user), auth_token))
}

/// Authenticates an existing user by email and password and issues a fresh JWT.
pub async fn login_user(
    ctx: &AppContext,
    input: LoginInput,
) -> Result<(PublicUserProfile, String), AuthServiceError> {
    let normalized_email = input.user_email.trim().to_lowercase();

    if normalized_email.is_empty() || input.user_password.is_empty() {
        return Err(AuthServiceError::Validation(String::from(
            "Email and password are required.",
        )));
    }

    // Step 1: Look up user by normalized email.
    let user_record = users::Model::find_by_email(&ctx.db, &normalized_email)
        .await
        .map_err(|error| AuthServiceError::Internal(format!("Database lookup failed: {error}")))?
        .ok_or_else(|| {
            AuthServiceError::InvalidCredentials(String::from("Invalid email or password."))
        })?;

    // Step 2: Reject inactive accounts and incorrect passwords with a generic message.
    if !user_record.is_active {
        return Err(AuthServiceError::InvalidCredentials(String::from(
            "This user account is inactive.",
        )));
    }

    let password_matches = verify_user_password(&input.user_password, &user_record.password_hash);
    if !password_matches {
        return Err(AuthServiceError::InvalidCredentials(String::from(
            "Invalid email or password.",
        )));
    }

    // Step 3: Issue a signed JWT using the server's secret key.
    let (jwt_secret, expiration_seconds) = load_jwt_settings(ctx)?;
    let (auth_token, _claims) =
        generate_jwt_token(&user_record, &jwt_secret, expiration_seconds)?;

    Ok((PublicUserProfile::from(&user_record), auth_token))
}

/// Records the token's unique ID (`jti`) in `revoked_tokens` so it is rejected on future requests.
pub async fn revoke_user_token(
    ctx: &AppContext,
    token_id: String,
    user_id: i32,
    expires_at_timestamp: i64,
) -> Result<(), AuthServiceError> {
    let utc_expiration = DateTime::from_timestamp(expires_at_timestamp, 0).unwrap_or_else(Utc::now);
    let fixed_expiration: DateTime<FixedOffset> = utc_expiration.fixed_offset();

    revoked_tokens::Model::revoke_token(&ctx.db, token_id, user_id, fixed_expiration)
        .await
        .map_err(|error| AuthServiceError::Internal(format!("Failed to revoke token: {error}")))
}
