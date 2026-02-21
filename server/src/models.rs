use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ============================================================================
// Database Models
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub role: UserRole,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Owner,
    Member,
}

impl UserRole {
    pub fn to_string(&self) -> String {
        match self {
            UserRole::Owner => "owner".to_string(),
            UserRole::Member => "member".to_string(),
        }
    }

    pub fn from_string(s: &str) -> Self {
        match s {
            "owner" => UserRole::Owner,
            _ => UserRole::Member,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Channel {
    pub id: Uuid,
    pub name: String,
    pub channel_type: ChannelType,
    pub max_users: Option<usize>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ChannelType {
    Text,
    Voice,
}

impl ChannelType {
    pub fn to_string(&self) -> String {
        match self {
            ChannelType::Text => "text".to_string(),
            ChannelType::Voice => "voice".to_string(),
        }
    }

    pub fn from_string(s: &str) -> Self {
        match s {
            "voice" => ChannelType::Voice,
            _ => ChannelType::Text,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub user_id: Uuid,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallHistory {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub duration_seconds: Option<i64>,
}

// ============================================================================
// WebSocket Protocol Messages
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum ClientMessage {
    #[serde(rename = "CONNECT")]
    Connect(ConnectPayload),
    
    #[serde(rename = "CREATE_CHANNEL")]
    CreateChannel(CreateChannelPayload),
    
    #[serde(rename = "DELETE_CHANNEL")]
    DeleteChannel(DeleteChannelPayload),
    
    #[serde(rename = "JOIN_CHANNEL")]
    JoinChannel(JoinChannelPayload),
    
    #[serde(rename = "LEAVE_CHANNEL")]
    LeaveChannel(LeaveChannelPayload),
    
    #[serde(rename = "SEND_MESSAGE")]
    SendMessage(SendMessagePayload),
    
    #[serde(rename = "JOIN_VOICE")]
    JoinVoice(JoinVoicePayload),
    
    #[serde(rename = "LEAVE_VOICE")]
    LeaveVoice(LeaveVoicePayload),
    
    #[serde(rename = "PING")]
    Ping,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectPayload {
    pub username: String,
    pub client_version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resume_session_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateChannelPayload {
    pub name: String,
    pub channel_type: ChannelType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeleteChannelPayload {
    pub channel_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JoinChannelPayload {
    pub channel_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaveChannelPayload {
    pub channel_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendMessagePayload {
    pub channel_id: Uuid,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JoinVoicePayload {
    pub channel_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaveVoicePayload {
    pub channel_id: Uuid,
}

// ============================================================================
// Server Messages
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum ServerMessage {
    #[serde(rename = "WELCOME")]
    Welcome(WelcomePayload),
    
    #[serde(rename = "ERROR")]
    Error(ErrorPayload),
    
    #[serde(rename = "CHANNEL_CREATED")]
    ChannelCreated(ChannelCreatedPayload),
    
    #[serde(rename = "CHANNEL_DELETED")]
    ChannelDeleted(ChannelDeletedPayload),
    
    #[serde(rename = "USER_JOINED")]
    UserJoined(UserJoinedPayload),
    
    #[serde(rename = "USER_LEFT")]
    UserLeft(UserLeftPayload),
    
    #[serde(rename = "MESSAGE")]
    Message(MessagePayload),
    
    #[serde(rename = "VOICE_JOINED")]
    VoiceJoined(VoiceJoinedPayload),
    
    #[serde(rename = "VOICE_LEFT")]
    VoiceLeft(VoiceLeftPayload),
    
    #[serde(rename = "PONG")]
    Pong,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WelcomePayload {
    pub session_id: Uuid,
    pub user_id: Uuid,
    pub server_version: String,
    pub role: UserRole,
    pub channels: Vec<Channel>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorPayload {
    pub code: ErrorCode,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    VersionMismatch,
    ServerFull,
    InvalidPayload,
    Unauthorized,
    ChannelNotFound,
    UserNotFound,
    RateLimited,
    MessageTooLarge,
    Internal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelCreatedPayload {
    pub channel: Channel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelDeletedPayload {
    pub channel_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserJoinedPayload {
    pub channel_id: Uuid,
    pub user: User,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserLeftPayload {
    pub channel_id: Uuid,
    pub user_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessagePayload {
    pub message: Message,
    pub username: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceJoinedPayload {
    pub channel_id: Uuid,
    pub user_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceLeftPayload {
    pub channel_id: Uuid,
    pub user_id: Uuid,
}
