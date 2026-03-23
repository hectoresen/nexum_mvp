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
    #[serde(skip_serializing)]
    pub ip_address: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
    pub avatar_path: Option<String>,
    pub avatar_version: i32,
    pub created_at: DateTime<Utc>,
    /// Whether the admin has text-muted this user.
    #[serde(default)]
    pub is_text_muted: bool,
    /// Whether the admin has voice-muted this user.
    #[serde(default)]
    pub is_voice_muted: bool,
    /// ed25519 device public key (hex). Never sent to clients.
    #[serde(skip_serializing)]
    pub device_public_key: Option<String>,
}

/// User augmented with real-time online status for SERVER_USERS broadcasts.
/// Not stored in the database — `is_online` is computed from active sessions.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserOnlineStatus {
    #[serde(flatten)]
    pub user: User,
    pub is_online: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ban {
    pub id: Uuid,
    pub user_id: Uuid,
    pub username: String,
    pub ip_address: String,
    pub device_public_key: Option<String>,
    pub banned_at: DateTime<Utc>,
    pub reason: Option<String>,
    pub banned_by_user_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KickLogEntry {
    pub id: Uuid,
    pub user_id: Uuid,
    pub username: String,
    pub ip_address: String,
    pub kicked_at: DateTime<Utc>,
    pub kicked_by_user_id: Uuid,
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
pub struct Category {
    pub id: Uuid,
    pub name: String,
    pub position: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Channel {
    pub id: Uuid,
    pub name: String,
    pub channel_type: ChannelType,
    pub max_users: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category_id: Option<Uuid>,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deleted_by_user_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deleted_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub edited_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallHistory {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub duration_seconds: Option<i64>,
}

/// A direct message between two users. Content is always encrypted client-side.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectMessage {
    pub id: Uuid,
    pub sender_id: Uuid,
    pub recipient_id: Uuid,
    /// AES-GCM encrypted content (base64-encoded: `<iv_b64>.<ciphertext_b64>`).
    /// The server never sees the plaintext.
    pub encrypted_content: String,
    pub created_at: DateTime<Utc>,
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
    
    #[serde(rename = "DELETE_MESSAGE")]
    DeleteMessage(DeleteMessagePayload),
    
    #[serde(rename = "EDIT_MESSAGE")]
    EditMessage(EditMessagePayload),
    
    #[serde(rename = "JOIN_VOICE")]
    JoinVoice(JoinVoicePayload),
    
    #[serde(rename = "LEAVE_VOICE")]
    LeaveVoice(LeaveVoicePayload),
    
    #[serde(rename = "AUTHENTICATE_ADMIN")]
    AuthenticateAdmin(AuthenticateAdminPayload),
    
    #[serde(rename = "RENAME_CHANNEL")]
    RenameChannel(RenameChannelPayload),
    
    #[serde(rename = "GET_SERVER_SETTINGS")]
    GetServerSettings,
    
    #[serde(rename = "UPDATE_SERVER_SETTINGS")]
    UpdateServerSettings(UpdateServerSettingsPayload),
    
    #[serde(rename = "GET_USERS")]
    GetUsers,
    
    #[serde(rename = "UPDATE_AVATAR")]
    UpdateAvatar(UpdateAvatarPayload),
    
    #[serde(rename = "PING")]
    Ping,
    
    #[serde(rename = "CREATE_CATEGORY")]
    CreateCategory(CreateCategoryPayload),
    
    #[serde(rename = "DELETE_CATEGORY")]
    DeleteCategory(DeleteCategoryPayload),
    
    #[serde(rename = "RENAME_CATEGORY")]
    RenameCategory(RenameCategoryPayload),
    
    #[serde(rename = "MOVE_CHANNEL_TO_CATEGORY")]
    MoveChannelToCategory(MoveChannelToCategoryPayload),

    #[serde(rename = "SEND_DM")]
    SendDm(SendDmPayload),

    #[serde(rename = "GET_DM_HISTORY")]
    GetDmHistory(GetDmHistoryPayload),

    #[serde(rename = "KICK_USER")]
    KickUser(KickUserPayload),

    #[serde(rename = "BAN_USER")]
    BanUser(BanUserPayload),

    #[serde(rename = "UNBAN_USER")]
    UnbanUser(UnbanUserPayload),

    #[serde(rename = "MUTE_USER")]
    MuteUser(MuteUserPayload),

    #[serde(rename = "GET_BAN_LIST")]
    GetBanList,

    #[serde(rename = "GET_KICK_LOG")]
    GetKickLog,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectPayload {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    pub client_version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resume_session_id: Option<Uuid>,
    /// Password required to join a private server (set by the server owner).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub join_password: Option<String>,
    /// Hex-encoded ed25519 public key — stable device identity, no hardware data collected.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub device_public_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateChannelPayload {
    pub name: String,
    pub channel_type: ChannelType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category_id: Option<Uuid>,
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
pub struct DeleteMessagePayload {
    pub message_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditMessagePayload {
    pub message_id: Uuid,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthenticateAdminPayload {
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenameChannelPayload {
    pub channel_id: Uuid,
    pub new_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateServerSettingsPayload {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_admin_password: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub admin_password: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_users: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_users_per_voice_channel: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_message_size: Option<usize>,
    /// Set or clear the server join password.
    /// - Some(non-empty string) → make server private with this password
    /// - Some("") → make server public (clear join password)
    /// - None → leave unchanged
    #[serde(skip_serializing_if = "Option::is_none")]
    pub join_password: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAvatarPayload {
    pub avatar_url: Option<String>,
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
    
    #[serde(rename = "MESSAGE_HISTORY")]
    MessageHistory(MessageHistoryPayload),
    
    #[serde(rename = "MESSAGE_DELETED")]
    MessageDeleted(MessageDeletedPayload),
    
    #[serde(rename = "MESSAGE_EDITED")]
    MessageEdited(MessageEditedPayload),
    
    #[serde(rename = "ADMIN_AUTHENTICATED")]
    AdminAuthenticated(AdminAuthenticatedPayload),
    
    #[serde(rename = "VOICE_JOINED")]
    VoiceJoined(VoiceJoinedPayload),
    
    #[serde(rename = "VOICE_LEFT")]
    VoiceLeft(VoiceLeftPayload),
    
    #[serde(rename = "CHANNEL_RENAMED")]
    ChannelRenamed(ChannelRenamedPayload),
    
    #[serde(rename = "SERVER_SETTINGS")]
    ServerSettings(ServerSettingsPayload),
    
    #[serde(rename = "SERVER_USERS")]
    ServerUsers(ServerUsersPayload),
    
    #[serde(rename = "USER_AVATAR_UPDATED")]
    UserAvatarUpdated(UserAvatarUpdatedPayload),
    
    #[serde(rename = "USER_UPDATED")]
    UserUpdated(UserUpdatedPayload),
    
    #[serde(rename = "PONG")]
    Pong,
    
    #[serde(rename = "CATEGORY_CREATED")]
    CategoryCreated(CategoryCreatedPayload),
    
    #[serde(rename = "CATEGORY_DELETED")]
    CategoryDeleted(CategoryDeletedPayload),
    
    #[serde(rename = "CATEGORY_RENAMED")]
    CategoryRenamed(CategoryRenamedPayload),
    
    #[serde(rename = "CHANNEL_MOVED")]
    ChannelMoved(ChannelMovedPayload),

    #[serde(rename = "DM_RECEIVED")]
    DmReceived(DmReceivedPayload),

    #[serde(rename = "DM_HISTORY")]
    DmHistory(DmHistoryPayload),

    #[serde(rename = "USER_KICKED")]
    UserKicked(UserKickedPayload),

    #[serde(rename = "USER_BANNED")]
    UserBanned(UserBannedPayload),

    #[serde(rename = "USER_MUTE_UPDATED")]
    UserMuteUpdated(UserMuteUpdatedPayload),

    #[serde(rename = "BAN_LIST")]
    BanList(BanListPayload),

    #[serde(rename = "KICK_LOG")]
    KickLog(KickLogPayload),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WelcomePayload {
    pub session_id: Uuid,
    pub user_id: Uuid,
    pub username: String,
    pub server_version: String,
    pub server_name: String,
    pub role: UserRole,
    pub channels: Vec<Channel>,
    pub categories: Vec<Category>,
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
    InvalidRequest,
    Unauthorized,
    ChannelNotFound,
    UserNotFound,
    RateLimited,
    MessageTooLarge,
    PasswordRequired,
    Banned,
    Kicked,
    MutedText,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
    pub avatar_path: Option<String>,
    pub avatar_version: i32,
    /// Username of the user who deleted the message (populated from history JOIN).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deleted_by_username: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageHistoryPayload {
    pub channel_id: Uuid,
    pub messages: Vec<MessagePayload>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageDeletedPayload {
    pub message_id: Uuid,
    pub channel_id: Uuid,
    pub deleted_by_user_id: Uuid,
    pub deleted_by_username: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageEditedPayload {
    pub message_id: Uuid,
    pub channel_id: Uuid,
    pub content: String,
    pub edited_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminAuthenticatedPayload {
    pub user_id: Uuid,
    pub new_role: UserRole,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelRenamedPayload {
    pub channel_id: Uuid,
    pub new_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerSettingsPayload {
    pub name: String,
    pub ws_port: u16,
    pub udp_port: u16,
    pub max_users: usize,
    pub max_users_per_voice_channel: usize,
    pub max_message_size: usize,
    /// Whether the server requires a join password (true = private).
    /// The join_password value itself is never sent to clients.
    pub is_private: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerUsersPayload {
    pub users: Vec<UserOnlineStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserAvatarUpdatedPayload {
    pub user_id: Uuid,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserUpdatedPayload {
    pub user_id: Uuid,
    pub avatar_version: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCategoryPayload {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeleteCategoryPayload {
    pub category_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenameCategoryPayload {
    pub category_id: Uuid,
    pub new_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveChannelToCategoryPayload {
    pub channel_id: Uuid,
    pub category_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryCreatedPayload {
    pub category: Category,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryDeletedPayload {
    pub category_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryRenamedPayload {
    pub category_id: Uuid,
    pub new_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelMovedPayload {
    pub channel_id: Uuid,
    pub category_id: Option<Uuid>,
}

// ============================================================================
// Direct Message Payloads
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendDmPayload {
    pub recipient_id: Uuid,
    /// AES-GCM encrypted content (base64-encoded: `<iv_b64>.<ciphertext_b64>`).
    pub encrypted_content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetDmHistoryPayload {
    pub other_user_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DmReceivedPayload {
    pub message_id: Uuid,
    pub sender_id: Uuid,
    pub recipient_id: Uuid,
    /// AES-GCM encrypted content — clients decrypt, server stores as opaque blob.
    pub encrypted_content: String,
    pub created_at: DateTime<Utc>,
    pub sender_username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sender_avatar_url: Option<String>,
    pub sender_avatar_path: Option<String>,
    pub sender_avatar_version: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DmHistoryPayload {
    pub other_user_id: Uuid,
    pub messages: Vec<DmReceivedPayload>,
}

// ============================================================================
// Moderation Payloads
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KickUserPayload {
    pub user_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BanUserPayload {
    pub user_id: Uuid,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnbanUserPayload {
    pub ban_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MuteUserPayload {
    pub user_id: Uuid,
    pub mute_text: bool,
    pub mute_voice: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserKickedPayload {
    pub user_id: Uuid,
    pub username: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserBannedPayload {
    pub user_id: Uuid,
    pub username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserMuteUpdatedPayload {
    pub user_id: Uuid,
    pub is_text_muted: bool,
    pub is_voice_muted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BanListPayload {
    pub bans: Vec<Ban>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KickLogPayload {
    pub entries: Vec<KickLogEntry>,
}
