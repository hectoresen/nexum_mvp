use axum::{
    extract::{ws::Message, Multipart, Path, State},
    http::{StatusCode, HeaderMap, header},
    response::{IntoResponse, Response},
    Json,
};
use image::{imageops::FilterType, DynamicImage, GenericImageView};
use serde::Serialize;
use std::sync::Arc;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tracing::{info, error};
use uuid::Uuid;

use crate::models::ServerMessage;
use crate::websocket::AppState;

const MAX_FILE_SIZE: usize = 200 * 1024; // 200 KB
const AVATARS_DIR: &str = "data/avatars";
const AVATAR_SIZE: u32 = 256; // 256x256 pixels

#[derive(Serialize)]
pub struct UploadResponse {
    pub success: bool,
    pub avatar_path: String,
    pub avatar_version: i32,
}

#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

/// Serve a static avatar file from disk.
/// GET /avatars/{filename}
/// This explicit handler (instead of nest_service/ServeDir) guarantees that the
/// CORS middleware applied via Router::layer actually wraps this endpoint — Axum 0.7
/// does not forward Router-level layers to services added via nest_service.
pub async fn serve_static_avatar(
    Path(filename): Path<String>,
    headers: HeaderMap,
) -> Response {
    // Security: reject any path that could escape data/avatars/
    if filename.contains("..") || filename.contains('/') || filename.contains('\\') || filename.contains('\0') {
        return StatusCode::FORBIDDEN.into_response();
    }
    // Only serve .webp files
    if !filename.ends_with(".webp") {
        return StatusCode::NOT_FOUND.into_response();
    }

    let file_path = format!("data/avatars/{}", filename);
    let etag = format!("\"{}\"", filename);

    // ETag-based cache validation
    if let Some(inm) = headers.get(header::IF_NONE_MATCH) {
        if inm.to_str().unwrap_or("") == etag {
            return StatusCode::NOT_MODIFIED.into_response();
        }
    }

    match tokio::fs::read(&file_path).await {
        Ok(data) => (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, "image/webp"),
                (header::CACHE_CONTROL, "public, max-age=86400"),
                (header::ETAG, etag.as_str()),
            ],
            data,
        )
            .into_response(),
        Err(_) => StatusCode::NOT_FOUND.into_response(),
    }
}


/// POST /api/users/{user_id}/avatar
/// Requires Authorization header with session ID
pub async fn upload_avatar_handler(
    Path(user_id): Path<Uuid>,
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Extract session ID from Authorization header
    let session_id = extract_session_id(&headers)?;
    
    // Verify session and get authenticated user ID
    let authenticated_user_id = state
        .session_manager
        .get_session(session_id)
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse {
                    error: "Invalid or expired session".to_string(),
                }),
            )
        })?;
    
    // Verify that the authenticated user is the same as the user_id in the path
    if authenticated_user_id != user_id {
        return Err((
            StatusCode::FORBIDDEN,
            Json(ErrorResponse {
                error: "You can only update your own avatar".to_string(),
            }),
        ));
    }
    
    // Ensure avatars directory exists
    if let Err(e) = fs::create_dir_all(AVATARS_DIR).await {
        error!("Failed to create avatars directory: {}", e);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: "Server configuration error".to_string(),
            }),
        ));
    }
    
    // Process multipart upload
    while let Some(field) = multipart.next_field().await.map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("Failed to read multipart data: {}", e),
            }),
        )
    })? {
        let name = field.name().unwrap_or("").to_string();
        
        if name == "avatar" {
            // Get content type
            let content_type = field.content_type().unwrap_or("").to_string();
            
            // Read file data
            let data = field.bytes().await.map_err(|e| {
                (
                    StatusCode::BAD_REQUEST,
                    Json(ErrorResponse {
                        error: format!("Failed to read file data: {}", e),
                    }),
                )
            })?;
            
            // Validate file size
            if data.len() > MAX_FILE_SIZE {
                return Err((
                    StatusCode::PAYLOAD_TOO_LARGE,
                    Json(ErrorResponse {
                        error: format!(
                            "File size exceeds maximum of {} KB",
                            MAX_FILE_SIZE / 1024
                        ),
                    }),
                ));
            }
            
            // Validate MIME type
            if !is_valid_mime_type(&content_type) {
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(ErrorResponse {
                        error: "Invalid file type. Only PNG and WebP are allowed".to_string(),
                    }),
                ));
            }
            
            // Process and save avatar
            match process_and_save_avatar(user_id, &data, &state).await {
                Ok((avatar_path, avatar_version)) => {
                    info!("Avatar uploaded successfully for user {}: {}", user_id, avatar_path);
                    
                    return Ok(Json(UploadResponse {
                        success: true,
                        avatar_path,
                        avatar_version,
                    }));
                }
                Err(e) => {
                    error!("Failed to process avatar: {}", e);
                    return Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ErrorResponse {
                            error: format!("Failed to process image: {}", e),
                        }),
                    ));
                }
            }
        }
    }
    
    Err((
        StatusCode::BAD_REQUEST,
        Json(ErrorResponse {
            error: "No avatar field found in request".to_string(),
        }),
    ))
}

/// Download avatar for a specific user
/// GET /api/users/{user_id}/avatar
/// Returns 304 Not Modified if ETag matches
pub async fn download_avatar_handler(
    Path(user_id): Path<Uuid>,
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Response, (StatusCode, Json<ErrorResponse>)> {
    // Get user from database
    let user = state.db.get_user(user_id).map_err(|e| {
        error!("Database error: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: "Database error".to_string(),
            }),
        )
    })?.ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "User not found".to_string(),
            }),
        )
    })?;
    
    // Check if user has an avatar
    let avatar_path = user.avatar_path.ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "User has no avatar".to_string(),
            }),
        )
    })?;
    
    // Generate ETag from version number
    let etag = format!("\"v{}\"", user.avatar_version);
    
    // Check If-None-Match header for cache validation
    if let Some(if_none_match) = headers.get(header::IF_NONE_MATCH) {
        if if_none_match.to_str().unwrap_or("") == etag {
            // Return 304 Not Modified
            return Ok((StatusCode::NOT_MODIFIED, ()).into_response());
        }
    }
    
    // Build full file path
    let file_path = format!("{}/{}", AVATARS_DIR, avatar_path.trim_start_matches("avatars/"));
    
    // Read file
    let file_data = fs::read(&file_path).await.map_err(|e| {
        error!("Failed to read avatar file {}: {}", file_path, e);
        (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Avatar file not found".to_string(),
            }),
        )
    })?;
    
    // Return image with cache headers
    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "image/webp"),
            (header::CACHE_CONTROL, "public, max-age=86400"), // 24 hours
            (header::ETAG, &etag),
        ],
        file_data,
    )
        .into_response())
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Extract session ID from Authorization header
/// Expected format: "Session <session_id>"
fn extract_session_id(headers: &HeaderMap) -> Result<Uuid, (StatusCode, Json<ErrorResponse>)> {
    let auth_header = headers
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse {
                    error: "Missing Authorization header".to_string(),
                }),
            )
        })?;
    
    if !auth_header.starts_with("Session ") {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                error: "Invalid Authorization header format".to_string(),
            }),
        ));
    }
    
    let session_id_str = &auth_header[8..]; // Skip "Session "
    Uuid::parse_str(session_id_str).map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                error: "Invalid session ID format".to_string(),
            }),
        )
    })
}

/// Validate MIME type - only PNG and WebP allowed
fn is_valid_mime_type(content_type: &str) -> bool {
    matches!(content_type, "image/png" | "image/webp")
}

/// Process image: decode, resize, re-encode to WebP, save to disk
async fn process_and_save_avatar(
    user_id: Uuid,
    data: &[u8],
    state: &Arc<AppState>,
) -> anyhow::Result<(String, i32)> {
    // Decode image
    let img = image::load_from_memory(data)?;
    
    // Resize to 256x256 (crop to square first if needed)
    let processed = resize_and_crop(img, AVATAR_SIZE);
    
    // Encode to WebP
    let webp_data = encode_to_webp(&processed)?;
    
    // Validate final size is under 200KB
    if webp_data.len() > MAX_FILE_SIZE {
        anyhow::bail!(
            "Processed image is too large ({} KB), please use a simpler image",
            webp_data.len() / 1024
        );
    }
    
    // Save to disk
    let filename = format!("{}.webp", user_id);
    let relative_path = format!("avatars/{}", filename);
    let full_path = format!("{}/{}", AVATARS_DIR, filename);
    
    let mut file = fs::File::create(&full_path).await?;
    file.write_all(&webp_data).await?;
    
    // Update database
    let avatar_version = state.db.update_avatar_path(user_id, relative_path.clone())?;
    
    // Broadcast USER_UPDATED via WebSocket
    broadcast_avatar_update(state, user_id, avatar_version);
    
    Ok((relative_path, avatar_version))
}

/// Resize and crop image to square format
fn resize_and_crop(img: DynamicImage, size: u32) -> DynamicImage {
    let (width, height) = img.dimensions();
    
    // Crop to square first
    let squared = if width > height {
        let offset = (width - height) / 2;
        img.crop_imm(offset, 0, height, height)
    } else if height > width {
        let offset = (height - width) / 2;
        img.crop_imm(0, offset, width, width)
    } else {
        img
    };
    
    // Resize to target size with high-quality filter
    squared.resize_exact(size, size, FilterType::Lanczos3)
}

/// Encode image to WebP format with quality 85
fn encode_to_webp(img: &DynamicImage) -> anyhow::Result<Vec<u8>> {
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();
    
    // Use webp crate for encoding
    let encoder = webp::Encoder::from_rgba(&rgba, width, height);
    let webp_data = encoder.encode(85.0); // Quality 85%
    
    Ok(webp_data.to_vec())
}

/// Broadcast USER_UPDATED message to all connected clients
fn broadcast_avatar_update(state: &Arc<AppState>, user_id: Uuid, avatar_version: i32) {
    let msg = ServerMessage::UserUpdated(crate::models::UserUpdatedPayload {
        user_id,
        avatar_version,
    });
    
    if let Ok(json) = serde_json::to_string(&msg) {
        state.session_manager.broadcast(Message::Text(json));
    }
}
