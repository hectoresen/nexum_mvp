use anyhow::{Result, bail};
use axum::extract::ws::Message;
use tokio::sync::mpsc;
use tracing::{info, warn};
use uuid::Uuid;
use std::sync::Arc;

use crate::models::*;
use crate::websocket::AppState;

const SERVER_VERSION: &str = "1.0.0";

pub async fn handle_message(
    text: &str,
    session_id: Option<Uuid>,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<Uuid> {
    let client_msg: ClientMessage = match serde_json::from_str(text) {
        Ok(msg) => msg,
        Err(e) => {
            send_error(tx, ErrorCode::InvalidPayload, &format!("Invalid JSON: {}", e))?;
            bail!("Invalid JSON payload");
        }
    };

    match client_msg {
        ClientMessage::Connect(payload) => {
            handle_connect(payload, state, tx).await
        }
        _ => {
            let sid = match session_id {
                Some(id) => id,
                None => {
                    send_error(tx, ErrorCode::Unauthorized, "Not connected")?;
                    bail!("No active session");
                }
            };

            match client_msg {
                ClientMessage::CreateChannel(p) => handle_create_channel(sid, p, state, tx).await,
                ClientMessage::DeleteChannel(p) => handle_delete_channel(sid, p, state, tx).await,
                ClientMessage::JoinChannel(p) => handle_join_channel(sid, p, state, tx).await,
                ClientMessage::LeaveChannel(p) => handle_leave_channel(sid, p, state, tx).await,
                ClientMessage::SendMessage(p) => handle_send_message(sid, p, state, tx).await,
                ClientMessage::JoinVoice(p) => handle_join_voice(sid, p, state, tx).await,
                ClientMessage::LeaveVoice(p) => handle_leave_voice(sid, p, state, tx).await,
                ClientMessage::Ping => handle_ping(tx).await,
                _ => unreachable!(),
            }?;

            Ok(sid)
        }
    }
}

async fn handle_connect(
    payload: ConnectPayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<Uuid> {
    // Check version compatibility (major version must match)
    let client_major = payload.client_version.split('.').next().unwrap_or("0");
    let server_major = SERVER_VERSION.split('.').next().unwrap_or("1");
    
    if client_major != server_major {
        send_error(
            tx,
            ErrorCode::VersionMismatch,
            &format!("Client version {} incompatible with server version {}", 
                payload.client_version, SERVER_VERSION)
        )?;
        bail!("Version mismatch");
    }

    // Check if server is full
    if state.session_manager.count_active_sessions() >= state.config.limits.max_users {
        send_error(tx, ErrorCode::ServerFull, "Server is at maximum capacity")?;
        bail!("Server full");
    }

    // Determine if this is the first user (becomes owner)
    let is_first = state.db.is_first_user()?;
    let role = if is_first {
        UserRole::Owner
    } else {
        UserRole::Member
    };

    // Create user in database
    let user = state.db.create_user(&payload.username, role)?;
    info!("New user created: {} ({}) as {:?}", user.username, user.id, user.role);

    // Create session
    let session_id = state.session_manager.create_session(user.clone(), tx.clone());

    // Get all channels
    let channels = state.db.list_channels()?;

    // Send WELCOME message
    let welcome = ServerMessage::Welcome(WelcomePayload {
        session_id,
        user_id: user.id,
        server_version: SERVER_VERSION.to_string(),
        role: user.role,
        channels,
    });

    send_message(tx, &welcome)?;

    Ok(session_id)
}

async fn handle_create_channel(
    session_id: Uuid,
    payload: CreateChannelPayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    // Check if user has permission (must be owner)
    let role = state.session_manager.get_user_role(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    if role != UserRole::Owner {
        send_error(tx, ErrorCode::Unauthorized, "Only owners can create channels")?;
        return Ok(());
    }

    // Create channel
    let channel = state.db.create_channel(
        &payload.name,
        payload.channel_type,
        None,
    )?;

    info!("Channel created: {} ({})", channel.name, channel.id);

    // Broadcast to all connected clients
    let msg = ServerMessage::ChannelCreated(ChannelCreatedPayload {
        channel,
    });

    broadcast_message(&state.session_manager, &msg);

    Ok(())
}

async fn handle_delete_channel(
    session_id: Uuid,
    payload: DeleteChannelPayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    // Check permission
    let role = state.session_manager.get_user_role(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    if role != UserRole::Owner {
        send_error(tx, ErrorCode::Unauthorized, "Only owners can delete channels")?;
        return Ok(());
    }

    // Delete channel
    state.db.delete_channel(payload.channel_id)?;
    info!("Channel deleted: {}", payload.channel_id);

    // Broadcast to all
    let msg = ServerMessage::ChannelDeleted(ChannelDeletedPayload {
        channel_id: payload.channel_id,
    });

    broadcast_message(&state.session_manager, &msg);

    Ok(())
}

async fn handle_join_channel(
    session_id: Uuid,
    payload: JoinChannelPayload,
    state: &Arc<AppState>,
    _tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let user_id = state.session_manager.get_session(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    // Verify channel exists
    state.db.get_channel(payload.channel_id)?
        .ok_or_else(|| anyhow::anyhow!("Channel not found"))?;

    // Join channel
    state.session_manager.join_channel(user_id, payload.channel_id);

    // Get user info
    let user = state.db.get_user(user_id)?
        .ok_or_else(|| anyhow::anyhow!("User not found"))?;

    // Notify channel members
    let msg = ServerMessage::UserJoined(UserJoinedPayload {
        channel_id: payload.channel_id,
        user,
    });

    broadcast_to_channel(&state.session_manager, payload.channel_id, &msg);

    Ok(())
}

async fn handle_leave_channel(
    session_id: Uuid,
    payload: LeaveChannelPayload,
    state: &Arc<AppState>,
    _tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let user_id = state.session_manager.get_session(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    // Leave channel
    state.session_manager.leave_channel(user_id);

    // Notify channel members
    let msg = ServerMessage::UserLeft(UserLeftPayload {
        channel_id: payload.channel_id,
        user_id,
    });

    broadcast_to_channel(&state.session_manager, payload.channel_id, &msg);

    Ok(())
}

async fn handle_send_message(
    session_id: Uuid,
    payload: SendMessagePayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let user_id = state.session_manager.get_session(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    // Validate message size
    if payload.content.len() > state.config.limits.max_message_size {
        send_error(
            tx,
            ErrorCode::MessageTooLarge,
            &format!("Message exceeds {} characters", state.config.limits.max_message_size)
        )?;
        return Ok(());
    }

    // Verify channel exists
    state.db.get_channel(payload.channel_id)?
        .ok_or_else(|| anyhow::anyhow!("Channel not found"))?;

    // Get user info
    let user = state.db.get_user(user_id)?
        .ok_or_else(|| anyhow::anyhow!("User not found"))?;

    // Store message
    let message = state.db.create_message(payload.channel_id, user_id, &payload.content)?;

    // Broadcast to channel
    let msg = ServerMessage::Message(MessagePayload {
        message,
        username: user.username,
    });

    broadcast_to_channel(&state.session_manager, payload.channel_id, &msg);

    Ok(())
}

async fn handle_join_voice(
    session_id: Uuid,
    payload: JoinVoicePayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let user_id = state.session_manager.get_session(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    // Verify channel exists and is a voice channel
    let channel = state.db.get_channel(payload.channel_id)?
        .ok_or_else(|| anyhow::anyhow!("Channel not found"))?;

    if channel.channel_type != ChannelType::Voice {
        send_error(tx, ErrorCode::InvalidPayload, "Channel is not a voice channel")?;
        return Ok(());
    }

    // Check channel capacity
    let current_members = state.session_manager.get_voice_channel_members(payload.channel_id);
    if current_members.len() >= state.config.limits.max_users_per_voice_channel {
        send_error(tx, ErrorCode::ServerFull, "Voice channel is full")?;
        return Ok(());
    }

    // Join voice channel
    state.session_manager.join_voice_channel(user_id, payload.channel_id);

    // Notify channel members
    let msg = ServerMessage::VoiceJoined(VoiceJoinedPayload {
        channel_id: payload.channel_id,
        user_id,
    });

    broadcast_to_channel(&state.session_manager, payload.channel_id, &msg);

    Ok(())
}

async fn handle_leave_voice(
    session_id: Uuid,
    payload: LeaveVoicePayload,
    state: &Arc<AppState>,
    _tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let user_id = state.session_manager.get_session(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    // Leave voice channel
    state.session_manager.leave_voice_channel(user_id, payload.channel_id);

    // Notify channel members
    let msg = ServerMessage::VoiceLeft(VoiceLeftPayload {
        channel_id: payload.channel_id,
        user_id,
    });

    broadcast_to_channel(&state.session_manager, payload.channel_id, &msg);

    Ok(())
}

async fn handle_ping(tx: &mpsc::UnboundedSender<Message>) -> Result<()> {
    let msg = ServerMessage::Pong;
    send_message(tx, &msg)?;
    Ok(())
}

// ============================================================================
// Helper Functions
// ============================================================================

fn send_message(tx: &mpsc::UnboundedSender<Message>, msg: &ServerMessage) -> Result<()> {
    let json = serde_json::to_string(msg)?;
    tx.send(Message::Text(json))?;
    Ok(())
}

fn send_error(
    tx: &mpsc::UnboundedSender<Message>,
    code: ErrorCode,
    message: &str,
) -> Result<()> {
    let error_msg = ServerMessage::Error(ErrorPayload {
        code,
        message: message.to_string(),
    });
    send_message(tx, &error_msg)
}

fn broadcast_message(session_manager: &crate::session::SessionManager, msg: &ServerMessage) {
    if let Ok(json) = serde_json::to_string(msg) {
        session_manager.broadcast(Message::Text(json));
    }
}

fn broadcast_to_channel(
    session_manager: &crate::session::SessionManager,
    channel_id: Uuid,
    msg: &ServerMessage,
) {
    if let Ok(json) = serde_json::to_string(msg) {
        session_manager.broadcast_to_channel(channel_id, Message::Text(json));
    }
}
