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
}

export interface Channel {
  id: string;
  name: string;
  channel_type: ChannelType;
  max_users?: number;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string; // Optional: populated from MessagePayload
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
  | { type: 'JOIN_VOICE'; payload: JoinVoicePayload }
  | { type: 'LEAVE_VOICE'; payload: LeaveVoicePayload }
  | { type: 'AUTHENTICATE_ADMIN'; payload: AuthenticateAdminPayload }
  | { type: 'GET_SERVER_SETTINGS' }
  | { type: 'UPDATE_SERVER_SETTINGS'; payload: UpdateServerSettingsPayload }
  | { type: 'GET_USERS' }
  | { type: 'UPDATE_AVATAR'; payload: UpdateAvatarPayload }
  | { type: 'PING' };

export interface ConnectPayload {
  username?: string; // Optional when resuming with resume_session_id
  client_version: string;
  resume_session_id?: string;
}

export interface CreateChannelPayload {
  name: string;
  channel_type: ChannelType;
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
  | { type: 'ADMIN_AUTHENTICATED'; payload: AdminAuthenticatedPayload }
  | { type: 'VOICE_JOINED'; payload: VoiceJoinedPayload }
  | { type: 'VOICE_LEFT'; payload: VoiceLeftPayload }
  | { type: 'SERVER_SETTINGS'; payload: ServerSettingsPayload }
  | { type: 'SERVER_USERS'; payload: ServerUsersPayload }
  | { type: 'USER_AVATAR_UPDATED'; payload: UserAvatarUpdatedPayload }
  | { type: 'USER_UPDATED'; payload: UserUpdatedPayload }
  | { type: 'PONG' };

export interface WelcomePayload {
  session_id: string;
  user_id: string;
  username: string;
  server_version: string;
  server_name: string;
  role: UserRole;
  channels: Channel[];
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
}

export interface MessageHistoryPayload {
  channel_id: string;
  messages: MessagePayload[];
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
