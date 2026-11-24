use std::path::{Path, PathBuf};

use uuid::Uuid;

/// Maximum permitted resume file size (5 MB).
pub const MAX_RESUME_FILE_SIZE_BYTES: usize = 5 * 1024 * 1024;

const PDF_MIME_TYPE: &str = "application/pdf";
const DOCX_MIME_TYPE: &str =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/// Metadata returned after validating and persisting a candidate's uploaded resume.
#[derive(Clone, Debug)]
pub struct StoredResumeMetadata {
    pub original_file_name: String,
    pub storage_key: String,
    pub mime_type: String,
    pub file_size_bytes: i32,
    pub storage_url: String,
}

/// Errors produced during resume file validation or storage.
#[derive(Debug)]
pub enum FileStorageError {
    InvalidFile(String),
    FileTooLarge(String),
    NotFound(String),
    StorageFailure(String),
}

/// Strips directory separators and unsafe characters from an uploaded filename.
fn sanitize_original_filename(raw_file_name: &str) -> String {
    let base_name = Path::new(raw_file_name)
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("resume.pdf");

    let cleaned: String = base_name
        .chars()
        .filter(|character| {
            character.is_ascii_alphanumeric()
                || *character == '.'
                || *character == '-'
                || *character == '_'
                || *character == ' '
        })
        .collect();

    let trimmed = cleaned.trim();
    if trimmed.is_empty() {
        String::from("resume.pdf")
    } else {
        trimmed.to_string()
    }
}

/// Inspects extension, declared MIME type, and actual magic bytes to confirm a genuine PDF or DOCX.
fn validate_resume_type_and_bytes(
    sanitized_file_name: &str,
    declared_mime_type: Option<&str>,
    file_bytes: &[u8],
) -> Result<(&'static str, &'static str), FileStorageError> {
    if file_bytes.is_empty() {
        return Err(FileStorageError::InvalidFile(String::from(
            "Uploaded resume file is empty.",
        )));
    }

    if file_bytes.len() > MAX_RESUME_FILE_SIZE_BYTES {
        return Err(FileStorageError::FileTooLarge(String::from(
            "Resume file exceeds the maximum allowed size of 5 MB.",
        )));
    }

    let lowercase_name = sanitized_file_name.to_lowercase();

    // PDF files must end in .pdf and begin with the `%PDF-` magic header.
    if lowercase_name.ends_with(".pdf") {
        let mime_matches = declared_mime_type
            .map(|mime| mime == PDF_MIME_TYPE || mime == "application/octet-stream")
            .unwrap_or(true);
        let has_pdf_magic = file_bytes.len() >= 5 && &file_bytes[..5] == b"%PDF-";

        if !mime_matches || !has_pdf_magic {
            return Err(FileStorageError::InvalidFile(String::from(
                "Invalid PDF file. Please upload a genuine PDF document.",
            )));
        }

        return Ok(("pdf", PDF_MIME_TYPE));
    }

    // DOCX files are ZIP containers beginning with `PK\x03\x04`.
    if lowercase_name.ends_with(".docx") {
        let mime_matches = declared_mime_type
            .map(|mime| mime == DOCX_MIME_TYPE || mime == "application/octet-stream")
            .unwrap_or(true);
        let has_zip_magic = file_bytes.len() >= 4 && &file_bytes[..4] == b"PK\x03\x04";

        if !mime_matches || !has_zip_magic {
            return Err(FileStorageError::InvalidFile(String::from(
                "Invalid DOCX file. Please upload a genuine Word (.docx) document.",
            )));
        }

        return Ok(("docx", DOCX_MIME_TYPE));
    }

    Err(FileStorageError::InvalidFile(String::from(
        "Unsupported file format. Only PDF (.pdf) and Word (.docx) resumes are allowed.",
    )))
}

/// Resolves the persistent local development resume storage directory (never `/tmp`).
fn development_resume_storage_directory() -> PathBuf {
    let configured_dir = std::env::var("RESUME_STORAGE_DIR")
        .unwrap_or_else(|_| String::from("storage/resumes"));
    PathBuf::from(configured_dir)
}

/// Validates and stores a candidate resume, returning metadata and a secure storage URL.
/// In production (`STORAGE_MODE=object_storage` or `LOCO_ENV=production`), local temp files are forbidden
/// and a configured HTTPS object storage URL (`STORAGE_BASE_URL`) is required.
pub async fn validate_and_store_resume(
    candidate_user_id: i32,
    raw_file_name: &str,
    declared_mime_type: Option<&str>,
    file_bytes: &[u8],
) -> Result<StoredResumeMetadata, FileStorageError> {
    let sanitized_name = sanitize_original_filename(raw_file_name);
    let (file_extension, canonical_mime_type) =
        validate_resume_type_and_bytes(&sanitized_name, declared_mime_type, file_bytes)?;

    let unique_token = Uuid::new_v4();
    let storage_key = format!("resume_user{candidate_user_id}_{unique_token}.{file_extension}");
    let storage_mode = std::env::var("STORAGE_MODE").unwrap_or_else(|_| String::from("development"));
    let loco_env = std::env::var("LOCO_ENV").unwrap_or_else(|_| String::from("development"));

    let use_object_storage =
        storage_mode == "object_storage" || (loco_env == "production" && storage_mode != "persistent_disk");

    let storage_url = if use_object_storage {
        // External object storage mode (S3 / R2 / GCS): never write local temp files; require HTTPS URL.
        let base_url = std::env::var("STORAGE_BASE_URL").map_err(|_| {
            FileStorageError::StorageFailure(String::from(
                "Production object storage is not configured (missing STORAGE_BASE_URL).",
            ))
        })?;

        if !base_url.starts_with("https://") {
            return Err(FileStorageError::StorageFailure(String::from(
                "Production STORAGE_BASE_URL must use HTTPS.",
            )));
        }

        let trimmed_base = base_url.trim_end_matches('/');
        format!("{trimmed_base}/{storage_key}")
    } else {
        // Persistent directory mode (`development` or Render `persistent_disk`, never OS `/tmp`).
        let storage_dir = development_resume_storage_directory();
        tokio::fs::create_dir_all(&storage_dir).await.map_err(|error| {
            FileStorageError::StorageFailure(format!(
                "Failed to initialize resume storage folder: {error}"
            ))
        })?;

        let target_path = storage_dir.join(&storage_key);
        tokio::fs::write(&target_path, file_bytes)
            .await
            .map_err(|error| {
                FileStorageError::StorageFailure(format!("Failed to persist resume file: {error}"))
            })?;

        let public_base = std::env::var("STORAGE_BASE_URL")
            .or_else(|_| {
                std::env::var("RENDER_EXTERNAL_URL")
                    .map(|url| format!("{}/api/candidates/resumes", url.trim_end_matches('/')))
            })
            .unwrap_or_else(|_| String::from("http://localhost:5150/api/candidates/resumes"));
        let trimmed_base = public_base.trim_end_matches('/');
        format!("{trimmed_base}/{storage_key}")
    };

    Ok(StoredResumeMetadata {
        original_file_name: sanitized_name,
        storage_key,
        mime_type: String::from(canonical_mime_type),
        file_size_bytes: file_bytes.len() as i32,
        storage_url,
    })
}

/// Validates a requested `storage_key` (blocking path traversal) and loads the stored file bytes.
pub async fn load_stored_resume_bytes(
    storage_key: &str,
) -> Result<(Vec<u8>, &'static str), FileStorageError> {
    let is_safe_key = !storage_key.is_empty()
        && !storage_key.contains("..")
        && !storage_key.contains('/')
        && !storage_key.contains('\\')
        && storage_key
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '_' || character == '-' || character == '.');

    if !is_safe_key {
        return Err(FileStorageError::InvalidFile(String::from(
            "Invalid resume storage key.",
        )));
    }

    let mime_type = if storage_key.ends_with(".pdf") {
        PDF_MIME_TYPE
    } else if storage_key.ends_with(".docx") {
        DOCX_MIME_TYPE
    } else {
        return Err(FileStorageError::InvalidFile(String::from(
            "Unsupported resume file extension.",
        )));
    };

    let target_path = development_resume_storage_directory().join(storage_key);
    let file_bytes = tokio::fs::read(&target_path).await.map_err(|_| {
        FileStorageError::NotFound(String::from("Requested resume file was not found."))
    })?;

    Ok((file_bytes, mime_type))
}
