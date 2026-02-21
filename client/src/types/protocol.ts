// ============================================================================
// Protocol Types - Shared with server
// ============================================================================

export type UserRole = 'owner' | 'member';
export type ChannelType = 'text' | 'voice';

export interface User {
  id: string;
  username: string;
  role: UserRole;
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
}

// ============================================================================
// Client Messages
// ============================================================================

export type ClientMessage =
  | { type: 'CONNECT'; payload: ConnectPayload }
  | { type: 'CREATE_CHANNEL'; payload: CreateChannelPayload }
  | { type: 'DELETE_CHANNEL'; payload: DeleteChannelPayload }
  | { type: 'JOIN_CHANNEL'; payload: JoinChannelPayload }
  | { type: 'LEAVE_CHANNEL'; payload: LeaveChannelPayload }
  | { type: 'SEND_MESSAGE'; payload: SendMessagePayload }
  | { type: 'JOIN_VOICE'; payload: JoinVoicePayload }
  | { type: 'LEAVE_VOICE'; payload: LeaveVoicePayload }
  | { type: 'PING' };

export interface ConnectPayload {
  username: string;
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

// ============================================================================
// Server Messages
// ============================================================================

export type ServerMessage =
  | { type: 'WELCOME'; payload: WelcomePayload }
  | { type: 'ERROR'; payload: ErrorPayload }
  | { type: 'CHANNEL_CREATED'; payload: ChannelCreatedPayload }
  | { type: 'CHANNEL_DELETED'; payload: ChannelDeletedPayload }
  | { type: 'USER_JOINED'; payload: UserJoinedPayload }
  | { type: 'USER_LEFT'; payload: UserLeftPayload }
  | { type: 'MESSAGE'; payload: MessagePayload }
  | { type: 'VOICE_JOINED'; payload: VoiceJoinedPayload }
  | { type: 'VOICE_LEFT'; payload: VoiceLeftPayload }
  | { type: 'PONG' };

export interface WelcomePayload {
  session_id: string;
  user_id: string;
  server_version: string;
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

export interface VoiceJoinedPayload {
  channel_id: string;
  user_id: string;
}

export interface VoiceLeftPayload {
  channel_id: string;
  user_id: string;
}
