// ============================================================================
// Protocol Types - Shared with server
// ============================================================================

export type UserRole = 'owner' | 'member';
export type ChannelType = 'text' | 'voice';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  avatar_url?: string;
  avatar_path?: string;
  avatar_version?: number;
  created_at: string;
  is_text_muted?: boolean;
  is_voice_muted?: boolean;
  is_online?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  channel_type: ChannelType;
  max_users?: number;
  category_id?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string; // Optional: populated from MessagePayload
  avatar_url?: string; // Optional: populated from MessagePayload
  avatar_path?: string; // Optional: populated from MessagePayload
  avatar_version?: number; // Optional: populated from MessagePayload
  deleted_by_user_id?: string; // Optional: set when message is deleted
  deleted_at?: string; // Optional: set when message is deleted
  deleted_by_username?: string; // Optional: username of deleter (from MessageDeletedPayload)
  edited_at?: string; // Optional: set when message is edited
}

// ============================================================================
// Client Messages
// ============================================================================

export type ClientMessage =
  | { type: 'CONNECT'; payload: ConnectPayload }
  | { type: 'CREATE_CHANNEL'; payload: CreateChannelPayload }
  | { type: 'DELETE_CHANNEL'; payload: DeleteChannelPayload }
  | { type: 'RENAME_CHANNEL'; payload: RenameChannelPayload }
  | { type: 'JOIN_CHANNEL'; payload: JoinChannelPayload }
  | { type: 'LEAVE_CHANNEL'; payload: LeaveChannelPayload }
  | { type: 'SEND_MESSAGE'; payload: SendMessagePayload }
  | { type: 'DELETE_MESSAGE'; payload: DeleteMessagePayload }
  | { type: 'EDIT_MESSAGE'; payload: EditMessagePayload }
  | { type: 'JOIN_VOICE'; payload: JoinVoicePayload }
  | { type: 'LEAVE_VOICE'; payload: LeaveVoicePayload }
  | { type: 'AUTHENTICATE_ADMIN'; payload: AuthenticateAdminPayload }
  | { type: 'GET_SERVER_SETTINGS' }
  | { type: 'UPDATE_SERVER_SETTINGS'; payload: UpdateServerSettingsPayload }
  | { type: 'GET_USERS' }
  | { type: 'UPDATE_AVATAR'; payload: UpdateAvatarPayload }
  | { type: 'CREATE_CATEGORY'; payload: CreateCategoryPayload }
  | { type: 'DELETE_CATEGORY'; payload: DeleteCategoryPayload }
  | { type: 'RENAME_CATEGORY'; payload: RenameCategoryPayload }
  | { type: 'MOVE_CHANNEL_TO_CATEGORY'; payload: MoveChannelToCategoryPayload }
  | { type: 'SEND_DM'; payload: SendDmPayload }
  | { type: 'GET_DM_HISTORY'; payload: GetDmHistoryPayload }
  | { type: 'KICK_USER'; payload: KickUserPayload }
  | { type: 'BAN_USER'; payload: BanUserPayload }
  | { type: 'UNBAN_USER'; payload: UnbanUserPayload }
  | { type: 'MUTE_USER'; payload: MuteUserPayload }
  | { type: 'GET_BAN_LIST' }
  | { type: 'GET_KICK_LOG' }
  | { type: 'PING' };

export interface ConnectPayload {
  username?: string; // Optional when resuming with resume_session_id
  client_version: string;
  resume_session_id?: string;
  /** Password required to join a private server. */
  join_password?: string;
  /** Hex-encoded ed25519 public key — stable device identity, no hardware data */
  device_public_key?: string;
}

export interface CreateChannelPayload {
  name: string;
  channel_type: ChannelType;
  category_id?: string;
}

export interface DeleteChannelPayload {
  channel_id: string;
}

export interface JoinChannelPayload {
  channel_id: string;
}

export interface LeaveChannelPayload {
  channel_id: string;
}

export interface SendMessagePayload {
  channel_id: string;
  content: string;
}

export interface DeleteMessagePayload {
  message_id: string;
}

export interface EditMessagePayload {
  message_id: string;
  content: string;
}

export interface JoinVoicePayload {
  channel_id: string;
}

export interface LeaveVoicePayload {
  channel_id: string;
}

export interface AuthenticateAdminPayload {
  password: string;
}

export interface RenameChannelPayload {
  channel_id: string;
  new_name: string;
}

export interface UpdateServerSettingsPayload {
  name?: string;
  current_admin_password?: string;
  admin_password?: string;
  max_users?: number;
  max_users_per_voice_channel?: number;
  max_message_size?: number;
  /** Set or clear join password. Empty string = make public. Non-empty = make private. */
  join_password?: string;
}

// ============================================================================
// Server Messages
// ============================================================================

export type ServerMessage =
  | { type: 'WELCOME'; payload: WelcomePayload }
  | { type: 'ERROR'; payload: ErrorPayload }
  | { type: 'CHANNEL_CREATED'; payload: ChannelCreatedPayload }
  | { type: 'CHANNEL_DELETED'; payload: ChannelDeletedPayload }
  | { type: 'CHANNEL_RENAMED'; payload: ChannelRenamedPayload }
  | { type: 'USER_JOINED'; payload: UserJoinedPayload }
  | { type: 'USER_LEFT'; payload: UserLeftPayload }
  | { type: 'MESSAGE'; payload: MessagePayload }
  | { type: 'MESSAGE_HISTORY'; payload: MessageHistoryPayload }
  | { type: 'MESSAGE_DELETED'; payload: MessageDeletedPayload }
  | { type: 'MESSAGE_EDITED'; payload: MessageEditedPayload }
  | { type: 'ADMIN_AUTHENTICATED'; payload: AdminAuthenticatedPayload }
  | { type: 'VOICE_JOINED'; payload: VoiceJoinedPayload }
  | { type: 'VOICE_LEFT'; payload: VoiceLeftPayload }
  | { type: 'SERVER_SETTINGS'; payload: ServerSettingsPayload }
  | { type: 'SERVER_USERS'; payload: ServerUsersPayload }
  | { type: 'USER_AVATAR_UPDATED'; payload: UserAvatarUpdatedPayload }
  | { type: 'USER_UPDATED'; payload: UserUpdatedPayload }
  | { type: 'CATEGORY_CREATED'; payload: CategoryCreatedPayload }
  | { type: 'CATEGORY_DELETED'; payload: CategoryDeletedPayload }
  | { type: 'CATEGORY_RENAMED'; payload: CategoryRenamedPayload }
  | { type: 'CHANNEL_MOVED'; payload: ChannelMovedPayload }
  | { type: 'DM_RECEIVED'; payload: DmReceivedPayload }
  | { type: 'DM_HISTORY'; payload: DmHistoryPayload }
  | { type: 'USER_KICKED'; payload: UserKickedPayload }
  | { type: 'USER_BANNED'; payload: UserBannedPayload }
  | { type: 'USER_MUTE_UPDATED'; payload: UserMuteUpdatedPayload }
  | { type: 'BAN_LIST'; payload: BanListPayload }
  | { type: 'KICK_LOG'; payload: KickLogPayload }
  | { type: 'PONG' };

export interface WelcomePayload {
  session_id: string;
  user_id: string;
  username: string;
  server_version: string;
  server_name: string;
  role: UserRole;
  channels: Channel[];
  categories: Category[];
}

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
}

export type ErrorCode =
  | 'VERSION_MISMATCH'
  | 'SERVER_FULL'
  | 'INVALID_PAYLOAD'
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'CHANNEL_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'MESSAGE_TOO_LARGE'
  | 'PASSWORD_REQUIRED'
  | 'BANNED'
  | 'KICKED'
  | 'MUTED_TEXT'
  | 'INTERNAL';

export interface ChannelCreatedPayload {
  channel: Channel;
}

export interface ChannelDeletedPayload {
  channel_id: string;
}

export interface UserJoinedPayload {
  channel_id: string;
  user: User;
}

export interface UserLeftPayload {
  channel_id: string;
  user_id: string;
}

export interface MessagePayload {
  message: Message;
  username: string;
  avatar_url?: string;
  avatar_path?: string;
  avatar_version: number;
  deleted_by_username?: string;
}

export interface MessageHistoryPayload {
  channel_id: string;
  messages: MessagePayload[];
}

export interface MessageDeletedPayload {
  message_id: string;
  channel_id: string;
  deleted_by_user_id: string;
  deleted_by_username: string;
}

export interface MessageEditedPayload {
  message_id: string;
  channel_id: string;
  content: string;
  edited_at: string;
}

export interface AdminAuthenticatedPayload {
  user_id: string;
  new_role: UserRole;
}

export interface VoiceJoinedPayload {
  channel_id: string;
  user_id: string;
}

export interface VoiceLeftPayload {
  channel_id: string;
  user_id: string;
}

export interface ChannelRenamedPayload {
  channel_id: string;
  new_name: string;
}

export interface ServerSettingsPayload {
  name: string;
  ws_port: number;
  udp_port: number;
  max_users: number;
  max_users_per_voice_channel: number;
  max_message_size: number;
  /** True if the server requires a join password (private). The password itself is never sent. */
  is_private: boolean;
}

export interface ServerUsersPayload {
  users: User[];
}

export interface UpdateAvatarPayload {
  avatar_url: string | null;
}

export interface UserAvatarUpdatedPayload {
  user_id: string;
  avatar_url: string | null;
}

export interface UserUpdatedPayload {
  user_id: string;
  avatar_version: number;
}

export interface CreateCategoryPayload {
  name: string;
}

export interface DeleteCategoryPayload {
  category_id: string;
}

export interface RenameCategoryPayload {
  category_id: string;
  new_name: string;
}

export interface MoveChannelToCategoryPayload {
  channel_id: string;
  category_id: string | null;
}

export interface CategoryCreatedPayload {
  category: Category;
}

export interface CategoryDeletedPayload {
  category_id: string;
}

export interface CategoryRenamedPayload {
  category_id: string;
  new_name: string;
}

export interface ChannelMovedPayload {
  channel_id: string;
  category_id: string | null;
}

// ============================================================================
// Direct Message Types
// ============================================================================

/**
 * A direct message as stored/displayed in the client.
 * `content` is the decrypted plaintext; `encrypted_content` is what the server holds.
 */
export interface DmMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  /** Encrypted wire representation stored by the server. */
  encrypted_content: string;
  /** Decrypted plaintext — populated after client-side decryption. */
  content: string;
  created_at: string;
  sender_username: string;
  sender_avatar_url?: string;
  sender_avatar_path?: string;
  sender_avatar_version: number;
}

export interface SendDmPayload {
  recipient_id: string;
  /** AES-GCM encrypted content: `<iv_base64>.<ciphertext_base64>` */
  encrypted_content: string;
}

export interface GetDmHistoryPayload {
  other_user_id: string;
}

export interface DmReceivedPayload {
  message_id: string;
  sender_id: string;
  recipient_id: string;
  encrypted_content: string;
  created_at: string;
  sender_username: string;
  sender_avatar_url?: string;
  sender_avatar_path?: string;
  sender_avatar_version: number;
}

export interface DmHistoryPayload {
  other_user_id: string;
  messages: DmReceivedPayload[];
}

// ============================================================================
// Moderation Types
// ============================================================================

export interface KickUserPayload {
  user_id: string;
}

export interface BanUserPayload {
  user_id: string;
  reason?: string;
}

export interface UnbanUserPayload {
  ban_id: string;
}

export interface MuteUserPayload {
  user_id: string;
  mute_text: boolean;
  mute_voice: boolean;
}

export interface UserKickedPayload {
  user_id: string;
  username: string;
}

export interface UserBannedPayload {
  user_id: string;
  username: string;
  reason?: string;
}

export interface UserMuteUpdatedPayload {
  user_id: string;
  is_text_muted: boolean;
  is_voice_muted: boolean;
}

export interface Ban {
  id: string;
  user_id: string;
  username: string;
  ip_address: string;
  device_public_key?: string;
  banned_at: string;
  reason?: string;
  banned_by_user_id: string;
}

export interface KickLogEntry {
  id: string;
  user_id: string;
  username: string;
  ip_address: string;
  kicked_at: string;
  kicked_by_user_id: string;
}

export interface BanListPayload {
  bans: Ban[];
}

export interface KickLogPayload {
  entries: KickLogEntry[];
}
