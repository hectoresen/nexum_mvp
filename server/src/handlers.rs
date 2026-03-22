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
    client_ip: Option<&str>,
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
            handle_connect(payload, state, tx, client_ip).await
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
                ClientMessage::RenameChannel(p) => handle_rename_channel(sid, p, state, tx).await,
                ClientMessage::JoinChannel(p) => handle_join_channel(sid, p, state, tx).await,
                ClientMessage::LeaveChannel(p) => handle_leave_channel(sid, p, state, tx).await,
                ClientMessage::SendMessage(p) => handle_send_message(sid, p, state, tx).await,
                ClientMessage::DeleteMessage(p) => handle_delete_message(sid, p, state, tx).await,
                ClientMessage::EditMessage(p) => handle_edit_message(sid, p, state, tx).await,
                ClientMessage::JoinVoice(p) => handle_join_voice(sid, p, state, tx).await,
                ClientMessage::LeaveVoice(p) => handle_leave_voice(sid, p, state, tx).await,
                ClientMessage::AuthenticateAdmin(p) => handle_authenticate_admin(sid, p, state, tx).await,
                ClientMessage::GetServerSettings => handle_get_server_settings(sid, state, tx).await,
                ClientMessage::UpdateServerSettings(p) => handle_update_server_settings(sid, p, state, tx).await,
                ClientMessage::GetUsers => handle_get_users(sid, state, tx).await,
                ClientMessage::UpdateAvatar(p) => handle_update_avatar(sid, p, state, tx).await,
                ClientMessage::CreateCategory(p) => handle_create_category(sid, p, state, tx).await,
                ClientMessage::DeleteCategory(p) => handle_delete_category(sid, p, state, tx).await,
                ClientMessage::RenameCategory(p) => handle_rename_category(sid, p, state, tx).await,
                ClientMessage::MoveChannelToCategory(p) => handle_move_channel_to_category(sid, p, state, tx).await,
                ClientMessage::Ping => handle_ping(tx).await,
                ClientMessage::SendDm(p) => handle_send_dm(sid, p, state, tx).await,
                ClientMessage::GetDmHistory(p) => handle_get_dm_history(sid, p, state, tx).await,
                ClientMessage::KickUser(p) => handle_kick_user(sid, p, state, tx).await,
                ClientMessage::BanUser(p) => handle_ban_user(sid, p, state, tx).await,
                ClientMessage::UnbanUser(p) => handle_unban_user(sid, p, state, tx).await,
                ClientMessage::MuteUser(p) => handle_mute_user(sid, p, state, tx).await,
                ClientMessage::GetBanList => handle_get_ban_list(sid, state, tx).await,
                ClientMessage::GetKickLog => handle_get_kick_log(sid, state, tx).await,
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
    client_ip: Option<&str>,
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
    if state.session_manager.count_active_sessions() >= state.config.read().unwrap().limits.max_users {
        send_error(tx, ErrorCode::ServerFull, "Server is at maximum capacity")?;
        bail!("Server full");
    }

    // Check join password if server is private
    {
        let join_pwd = state.config.read().unwrap().server.join_password.clone();
        if let Some(ref required) = join_pwd {
            if !required.is_empty() {
                match payload.join_password.as_deref() {
                    Some(provided) if provided == required.as_str() => { /* correct */ }
                    Some(_) => {
                        send_error(tx, ErrorCode::PasswordRequired, "Incorrect join password")?;
                        bail!("Incorrect join password");
                    }
                    None => {
                        send_error(tx, ErrorCode::PasswordRequired, "This server is private. Enter the join password to connect.")?;
                        bail!("No join password provided");
                    }
                }
            }
        }
    }

    // Determine user: resume by session ID, resume by device key, or create new user
    let connecting_device_key = payload.device_public_key.clone();
    let user = if let Some(resume_id) = payload.resume_session_id {
        // Client is trying to resume with existing user ID
        match state.db.get_user(resume_id)? {
            Some(existing_user) => {
                info!("User resumed by session ID: {} ({}) as {:?}", existing_user.username, existing_user.id, existing_user.role);
                existing_user
            }
            None => {
                send_error(tx, ErrorCode::InvalidRequest, "Invalid user ID")?;
                bail!("User ID not found");
            }
        }
    } else if let Some(ref device_key) = payload.device_public_key {
        // Client sends a stable ed25519 device public key — look up by it first
        match state.db.get_user_by_device_key(device_key)? {
            Some(existing_user) => {
                // Known device: resume regardless of IP change
                info!("User resumed by device key: {} ({}) as {:?}", existing_user.username, existing_user.id, existing_user.role);
                existing_user
            }
            None => {
                // Unknown device: create new user and link the key
                let username = match payload.username {
                    Some(name) => name,
                    None => {
                        send_error(tx, ErrorCode::InvalidPayload, "Username is required for new connections")?;
                        bail!("Username missing");
                    }
                };
                if let Some(_existing) = state.db.get_user_by_username(&username)? {
                    send_error(tx, ErrorCode::InvalidRequest, "Username already in use")?;
                    bail!("Username already taken");
                }
                let role = UserRole::Member;
                let new_user = state.db.create_user(&username, role, client_ip.map(|s| s.to_string()))?;
                // Bind the device key so future connections from this device resume automatically
                if let Err(e) = state.db.link_device_key(new_user.id, device_key) {
                    warn!("Could not link device key for {}: {}", new_user.id, e);
                }
                info!("New user created with device key: {} ({}) as {:?}", new_user.username, new_user.id, new_user.role);
                new_user
            }
        }
    } else {
        // Username is required for new connections
        let username = match payload.username {
            Some(name) => name,
            None => {
                send_error(tx, ErrorCode::InvalidPayload, "Username is required for new connections")?;
                bail!("Username missing");
            }
        };

        // Check if username is available
        if let Some(_existing) = state.db.get_user_by_username(&username)? {
            send_error(tx, ErrorCode::InvalidRequest, "Username already in use")?;
            bail!("Username already taken");
        }

        // All new users start as Member
        // They must authenticate with admin password to become Owner
        let role = UserRole::Member;

        // Create new user in database with IP address
        let new_user = state.db.create_user(&username, role, client_ip.map(|s| s.to_string()))?;
        info!("New user created: {} ({}) as {:?} from IP {:?}", new_user.username, new_user.id, new_user.role, client_ip);
        new_user
    };

    // Check if user is banned before creating a session
    let ban_ip = user.ip_address.as_deref().unwrap_or("0.0.0.0");
    if let Some(_ban) = state.db.is_banned(connecting_device_key.as_deref(), ban_ip, user.id)? {
        send_error(tx, ErrorCode::Banned, "You have been banned from this server")?;
        bail!("User is banned");
    }

    // Create session
    let session_id = state.session_manager.create_session(user.clone(), tx.clone());

    // Get all channels
    let channels = state.db.list_channels()?;

    // Get all categories
    let categories = state.db.list_categories()?;

    // Get server name from config
    let server_name = state.config.read().unwrap().server.name.clone();

    // Send WELCOME message
    let welcome = ServerMessage::Welcome(WelcomePayload {
        session_id,
        user_id: user.id,
        username: user.username.clone(),
        server_version: SERVER_VERSION.to_string(),
        server_name,
        role: user.role,
        channels,
        categories,
    });

    send_message(tx, &welcome)?;

    // Broadcast updated user list to all connected clients so they see the new user
    if let Ok(all_users) = state.db.list_users() {
        let users_msg = ServerMessage::ServerUsers(ServerUsersPayload { users: all_users });
        broadcast_message(&state.session_manager, &users_msg);
    }

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
        payload.category_id,
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

    // Delete associated messages first (prevents FK violations and cleans up orphaned rows)
    if let Err(e) = state.db.delete_channel_messages(payload.channel_id) {
        warn!("Failed to delete messages for channel {}: {}", payload.channel_id, e);
        send_error(tx, ErrorCode::Internal, "Failed to delete channel messages")?;
        return Ok(());
    }

    // Delete channel
    if let Err(e) = state.db.delete_channel(payload.channel_id) {
        warn!("Failed to delete channel {}: {}", payload.channel_id, e);
        send_error(tx, ErrorCode::Internal, "Failed to delete channel")?;
        return Ok(());
    }
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
    tx: &mpsc::UnboundedSender<Message>,
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

    // Load message history (last 50 messages)
    let history = state.db.get_message_history(payload.channel_id, 50)?;
    let message_payloads: Vec<MessagePayload> = history.into_iter()
        .map(|(message, username, avatar_url, avatar_path, avatar_version)| MessagePayload { 
            message, 
            username,
            avatar_url,
            avatar_path,
            avatar_version,
        })
        .collect();

    // Send history to the user who joined
    if !message_payloads.is_empty() {
        let history_msg = ServerMessage::MessageHistory(MessageHistoryPayload {
            channel_id: payload.channel_id,
            messages: message_payloads,
        });
        send_message(tx, &history_msg)?;
    }

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
    if payload.content.len() > state.config.read().unwrap().limits.max_message_size {
        send_error(
            tx,
            ErrorCode::MessageTooLarge,
            &format!("Message exceeds {} characters", state.config.read().unwrap().limits.max_message_size)
        )?;
        return Ok(());
    }

    // Verify channel exists
    state.db.get_channel(payload.channel_id)?
        .ok_or_else(|| anyhow::anyhow!("Channel not found"))?;

    // Get user info
    let user = state.db.get_user(user_id)?
        .ok_or_else(|| anyhow::anyhow!("User not found"))?;

    // Reject muted users from sending text
    if user.is_text_muted {
        send_error(tx, ErrorCode::MutedText, "You are muted in text channels")?;
        return Ok(());
    }

    // Store message
    let message = state.db.create_message(payload.channel_id, user_id, &payload.content)?;

    // Broadcast to channel
    let msg = ServerMessage::Message(MessagePayload {
        message,
        username: user.username,
        avatar_url: user.avatar_url,
        avatar_path: user.avatar_path,
        avatar_version: user.avatar_version,
    });

    broadcast_to_channel(&state.session_manager, payload.channel_id, &msg);

    Ok(())
}

async fn handle_delete_message(
    session_id: Uuid,
    payload: DeleteMessagePayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let user_id = state.session_manager.get_session(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    // Get the message to check ownership
    let message = state.db.get_message(payload.message_id)?
        .ok_or_else(|| anyhow::anyhow!("Message not found"))?;
    
    // Verify the user owns the message (TODO: Allow owners to delete any message)
    if message.user_id != user_id {
        send_error(tx, ErrorCode::Unauthorized, "You can only delete your own messages")?;
        return Ok(());
    }

    // Mark message as deleted
    state.db.delete_message(payload.message_id, user_id)?;

    // Get user info for broadcast
    let user = state.db.get_user(user_id)?
        .ok_or_else(|| anyhow::anyhow!("User not found"))?;

    // Broadcast deletion to channel
    let msg = ServerMessage::MessageDeleted(MessageDeletedPayload {
        message_id: payload.message_id,
        channel_id: message.channel_id,
        deleted_by_user_id: user_id,
        deleted_by_username: user.username,
    });

    broadcast_to_channel(&state.session_manager, message.channel_id, &msg);

    Ok(())
}

async fn handle_edit_message(
    session_id: Uuid,
    payload: EditMessagePayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let user_id = state.session_manager.get_session(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    // Validate content length
    if payload.content.is_empty() || payload.content.len() > 2000 {
        send_error(tx, ErrorCode::InvalidPayload, "Message content must be 1-2000 characters")?;
        return Ok(());
    }

    // Get the message to check ownership
    let message = state.db.get_message(payload.message_id)?
        .ok_or_else(|| anyhow::anyhow!("Message not found"))?;
    
    // Verify the user owns the message
    if message.user_id != user_id {
        send_error(tx, ErrorCode::Unauthorized, "You can only edit your own messages")?;
        return Ok(());
    }

    // Update message content
    state.db.update_message_content(payload.message_id, &payload.content)?;

    // Broadcast edited message to channel
    let edited_at = chrono::Utc::now();
    let msg = ServerMessage::MessageEdited(MessageEditedPayload {
        message_id: payload.message_id,
        channel_id: message.channel_id,
        content: payload.content,
        edited_at: edited_at.to_rfc3339(),
    });

    broadcast_to_channel(&state.session_manager, message.channel_id, &msg);

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
    if current_members.len() >= state.config.read().unwrap().limits.max_users_per_voice_channel {
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

async fn handle_authenticate_admin(
    session_id: Uuid,
    payload: AuthenticateAdminPayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let user_id = state.session_manager.get_session(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    // Get current user
    let user = state.db.get_user(user_id)?
        .ok_or_else(|| anyhow::anyhow!("User not found"))?;

    // Check if already owner
    if user.role == UserRole::Owner {
        send_error(tx, ErrorCode::InvalidRequest, "You are already an owner")?;
        return Ok(());
    }

    // Verify password
    if payload.password != state.config.read().unwrap().server.admin_password {
        send_error(tx, ErrorCode::Unauthorized, "Invalid admin password")?;
        return Ok(());
    }

    // Promote to owner
    state.db.update_user_role(user_id, UserRole::Owner)?;
    
    // Update session role
    state.session_manager.update_user_role(session_id, UserRole::Owner);

    info!("User {} authenticated as admin", user.username);

    // Send confirmation
    let msg = ServerMessage::AdminAuthenticated(AdminAuthenticatedPayload {
        user_id,
        new_role: UserRole::Owner,
    });
    send_message(tx, &msg)?;

    Ok(())
}

async fn handle_ping(tx: &mpsc::UnboundedSender<Message>) -> Result<()> {
    let msg = ServerMessage::Pong;
    send_message(tx, &msg)?;
    Ok(())
}

async fn handle_rename_channel(
    session_id: Uuid,
    payload: RenameChannelPayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let role = state.session_manager.get_user_role(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    if role != UserRole::Owner {
        send_error(tx, ErrorCode::Unauthorized, "Only owners can rename channels")?;
        return Ok(());
    }

    let channel = state.db.rename_channel(payload.channel_id, &payload.new_name)?;
    info!("Channel renamed: {} -> {} ({})", payload.channel_id, payload.new_name, channel.id);

    let msg = ServerMessage::ChannelRenamed(ChannelRenamedPayload {
        channel_id: payload.channel_id,
        new_name: payload.new_name,
    });
    broadcast_message(&state.session_manager, &msg);

    Ok(())
}

async fn handle_get_server_settings(
    session_id: Uuid,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let role = state.session_manager.get_user_role(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    if role != UserRole::Owner {
        send_error(tx, ErrorCode::Unauthorized, "Only owners can view server settings")?;
        return Ok(());
    }

    let cfg = state.config.read().unwrap();
    let msg = ServerMessage::ServerSettings(ServerSettingsPayload {
        name: cfg.server.name.clone(),
        ws_port: cfg.server.ws_port,
        udp_port: cfg.server.udp_port,
        max_users: cfg.limits.max_users,
        max_users_per_voice_channel: cfg.limits.max_users_per_voice_channel,
        max_message_size: cfg.limits.max_message_size,
        is_private: cfg.server.join_password.as_deref().map_or(false, |p| !p.is_empty()),
    });
    drop(cfg);
    send_message(tx, &msg)?;

    Ok(())
}

async fn handle_update_server_settings(
    session_id: Uuid,
    payload: UpdateServerSettingsPayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let role = state.session_manager.get_user_role(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    if role != UserRole::Owner {
        send_error(tx, ErrorCode::Unauthorized, "Only owners can update server settings")?;
        return Ok(());
    }

    {
        let mut cfg = state.config.write().unwrap();
        if let Some(name) = payload.name {
            cfg.server.name = name;
        }
        
        // Password change requires current password verification
        if let Some(new_pwd) = payload.admin_password {
            if !new_pwd.is_empty() {
                // Verify current password if provided
                if let Some(current_pwd) = payload.current_admin_password {
                    if current_pwd != cfg.server.admin_password {
                        send_error(tx, ErrorCode::Unauthorized, "Current admin password is incorrect")?;
                        return Ok(());
                    }
                    cfg.server.admin_password = new_pwd;
                } else {
                    // Require current password for password change
                    send_error(tx, ErrorCode::InvalidRequest, "Current admin password is required to change password")?;
                    return Ok(());
                }
            }
        }
        
        if let Some(max) = payload.max_users {
            cfg.limits.max_users = max;
        }
        if let Some(max_voice) = payload.max_users_per_voice_channel {
            cfg.limits.max_users_per_voice_channel = max_voice;
        }
        if let Some(max_msg) = payload.max_message_size {
            cfg.limits.max_message_size = max_msg;
        }
        // Update join password: empty string clears it (public server), non-empty sets it (private server)
        if let Some(jp) = payload.join_password {
            cfg.server.join_password = if jp.is_empty() { None } else { Some(jp) };
        }
    }

    // Persist to disk
    let cfg_snapshot = state.config.read().unwrap().clone();
    if let Err(e) = cfg_snapshot.save(&state.config_path) {
        warn!("Failed to save config: {}", e);
    } else {
        info!("Server settings updated and saved");
    }

    // Send updated settings back
    let cfg = state.config.read().unwrap();
    let msg = ServerMessage::ServerSettings(ServerSettingsPayload {
        name: cfg.server.name.clone(),
        ws_port: cfg.server.ws_port,
        udp_port: cfg.server.udp_port,
        max_users: cfg.limits.max_users,
        max_users_per_voice_channel: cfg.limits.max_users_per_voice_channel,
        max_message_size: cfg.limits.max_message_size,
        is_private: cfg.server.join_password.as_deref().map_or(false, |p| !p.is_empty()),
    });
    drop(cfg);
    send_message(tx, &msg)?;

    Ok(())
}

async fn handle_get_users(
    session_id: Uuid,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    // Any authenticated user can see the user list
    let _user_id = state.session_manager.get_session(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    let users = state.db.list_users()?;
    let msg = ServerMessage::ServerUsers(ServerUsersPayload { users });
    send_message(tx, &msg)?;

    Ok(())
}

async fn handle_update_avatar(
    session_id: Uuid,
    payload: UpdateAvatarPayload,
    state: &Arc<AppState>,
    _tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    // Get user ID from session
    let user_id = state.session_manager.get_session(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    // Update avatar in database
    state.db.update_user_avatar(user_id, payload.avatar_url.clone())?;

    info!("User {} updated avatar", user_id);

    // Broadcast avatar update to all connected clients
    let msg = ServerMessage::UserAvatarUpdated(UserAvatarUpdatedPayload {
        user_id,
        avatar_url: payload.avatar_url,
    });

    broadcast_message(&state.session_manager, &msg);

    Ok(())
}

async fn handle_create_category(
    session_id: Uuid,
    payload: CreateCategoryPayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let role = state.session_manager.get_user_role(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    if role != UserRole::Owner {
        send_error(tx, ErrorCode::Unauthorized, "Only owners can create categories")?;
        return Ok(());
    }

    if payload.name.trim().is_empty() {
        send_error(tx, ErrorCode::InvalidPayload, "Category name cannot be empty")?;
        return Ok(());
    }

    let category = state.db.create_category(payload.name.trim())?;
    info!("Category created: {} ({})", category.name, category.id);

    let msg = ServerMessage::CategoryCreated(CategoryCreatedPayload { category });
    broadcast_message(&state.session_manager, &msg);

    Ok(())
}

async fn handle_delete_category(
    session_id: Uuid,
    payload: DeleteCategoryPayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let role = state.session_manager.get_user_role(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    if role != UserRole::Owner {
        send_error(tx, ErrorCode::Unauthorized, "Only owners can delete categories")?;
        return Ok(());
    }

    state.db.delete_category(payload.category_id)?;
    info!("Category deleted: {}", payload.category_id);

    let msg = ServerMessage::CategoryDeleted(CategoryDeletedPayload {
        category_id: payload.category_id,
    });
    broadcast_message(&state.session_manager, &msg);

    Ok(())
}

async fn handle_rename_category(
    session_id: Uuid,
    payload: RenameCategoryPayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let role = state.session_manager.get_user_role(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    if role != UserRole::Owner {
        send_error(tx, ErrorCode::Unauthorized, "Only owners can rename categories")?;
        return Ok(());
    }

    if payload.new_name.trim().is_empty() {
        send_error(tx, ErrorCode::InvalidPayload, "Category name cannot be empty")?;
        return Ok(());
    }

    state.db.rename_category(payload.category_id, payload.new_name.trim())?;
    info!("Category renamed: {} -> {}", payload.category_id, payload.new_name);

    let msg = ServerMessage::CategoryRenamed(CategoryRenamedPayload {
        category_id: payload.category_id,
        new_name: payload.new_name,
    });
    broadcast_message(&state.session_manager, &msg);

    Ok(())
}

async fn handle_move_channel_to_category(
    session_id: Uuid,
    payload: MoveChannelToCategoryPayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let role = state.session_manager.get_user_role(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    if role != UserRole::Owner {
        send_error(tx, ErrorCode::Unauthorized, "Only owners can move channels")?;
        return Ok(());
    }

    // Verify channel exists
    state.db.get_channel(payload.channel_id)?
        .ok_or_else(|| anyhow::anyhow!("Channel not found"))?;

    state.db.update_channel_category(payload.channel_id, payload.category_id)?;
    info!("Channel {} moved to category {:?}", payload.channel_id, payload.category_id);

    let msg = ServerMessage::ChannelMoved(ChannelMovedPayload {
        channel_id: payload.channel_id,
        category_id: payload.category_id,
    });
    broadcast_message(&state.session_manager, &msg);

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

// ============================================================================
// Direct Message Handlers
// ============================================================================

async fn handle_send_dm(
    session_id: Uuid,
    payload: SendDmPayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let sender_id = state
        .session_manager
        .get_session(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    // Validate recipient exists
    let recipient = match state.db.get_user(payload.recipient_id)? {
        Some(u) => u,
        None => {
            send_error(tx, ErrorCode::UserNotFound, "Recipient not found")?;
            return Ok(());
        }
    };

    // Cannot DM yourself
    if sender_id == payload.recipient_id {
        send_error(tx, ErrorCode::InvalidRequest, "Cannot send a DM to yourself")?;
        return Ok(());
    }

    // Validate encrypted_content is non-empty and not too large (max 8 KB)
    if payload.encrypted_content.is_empty() || payload.encrypted_content.len() > 16_384 {
        send_error(tx, ErrorCode::MessageTooLarge, "Encrypted content is empty or too large")?;
        return Ok(());
    }

    // Persist message
    let dm = state
        .db
        .save_dm(sender_id, payload.recipient_id, &payload.encrypted_content)?;

    let sender = state
        .db
        .get_user(sender_id)?
        .ok_or_else(|| anyhow::anyhow!("Sender not found"))?;

    let dm_payload = DmReceivedPayload {
        message_id: dm.id,
        sender_id,
        recipient_id: payload.recipient_id,
        encrypted_content: dm.encrypted_content.clone(),
        created_at: dm.created_at,
        sender_username: sender.username.clone(),
        sender_avatar_url: sender.avatar_url.clone(),
        sender_avatar_path: sender.avatar_path.clone(),
        sender_avatar_version: sender.avatar_version,
    };

    let msg = ServerMessage::DmReceived(dm_payload);
    let json = serde_json::to_string(&msg)?;

    // Deliver to sender (so their UI can show the message)
    tx.send(Message::Text(json.clone()))?;

    // Deliver to recipient if online
    state
        .session_manager
        .send_to_user(recipient.id, Message::Text(json));

    Ok(())
}

async fn handle_get_dm_history(
    session_id: Uuid,
    payload: GetDmHistoryPayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let my_user_id = state
        .session_manager
        .get_session(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    let messages = state.db.get_dm_history(my_user_id, payload.other_user_id)?;

    let mut dm_payloads: Vec<DmReceivedPayload> = Vec::with_capacity(messages.len());
    for dm in messages {
        let sender = state
            .db
            .get_user(dm.sender_id)?
            .unwrap_or_else(|| crate::models::User {
                id: dm.sender_id,
                username: "[deleted]".to_string(),
                role: crate::models::UserRole::Member,
                ip_address: None,
                avatar_url: None,
                avatar_path: None,
                avatar_version: 0,
                created_at: dm.created_at,
                is_text_muted: false,
                is_voice_muted: false,
                device_public_key: None,
            });
        dm_payloads.push(DmReceivedPayload {
            message_id: dm.id,
            sender_id: dm.sender_id,
            recipient_id: dm.recipient_id,
            encrypted_content: dm.encrypted_content,
            created_at: dm.created_at,
            sender_username: sender.username,
            sender_avatar_url: sender.avatar_url,
            sender_avatar_path: sender.avatar_path,
            sender_avatar_version: sender.avatar_version,
        });
    }

    send_message(
        tx,
        &ServerMessage::DmHistory(DmHistoryPayload {
            other_user_id: payload.other_user_id,
            messages: dm_payloads,
        }),
    )?;

    Ok(())
}

// ============================================================================
// Moderation Handlers
// ============================================================================

async fn handle_kick_user(
    session_id: Uuid,
    payload: KickUserPayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let kicker_user_id = state.session_manager.get_session(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    let role = state.session_manager.get_user_role(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;
    if role != UserRole::Owner {
        send_error(tx, ErrorCode::Unauthorized, "Only owners can kick users")?;
        return Ok(());
    }

    if kicker_user_id == payload.user_id {
        send_error(tx, ErrorCode::InvalidRequest, "You cannot kick yourself")?;
        return Ok(());
    }

    let target = match state.db.get_user(payload.user_id)? {
        Some(u) => u,
        None => {
            send_error(tx, ErrorCode::UserNotFound, "User not found")?;
            return Ok(());
        }
    };

    // Send KICKED error to target's session before dropping it
    if let Some(target_sid) = state.session_manager.get_session_id_for_user(payload.user_id) {
        let _ = state.session_manager.send_to_session(
            target_sid,
            Message::Text(serde_json::to_string(&ServerMessage::Error(ErrorPayload {
                code: ErrorCode::Kicked,
                message: "You have been kicked from the server".to_string(),
            })).unwrap()),
        );
        state.session_manager.remove_session(target_sid);
    }

    // Log the kick
    let ip = target.ip_address.as_deref().unwrap_or("0.0.0.0");
    if let Err(e) = state.db.add_kick_log(payload.user_id, &target.username, ip, kicker_user_id) {
        warn!("Failed to log kick for {}: {}", payload.user_id, e);
    }

    info!("User {} kicked by {}", target.username, kicker_user_id);

    // Broadcast to all remaining clients
    broadcast_message(&state.session_manager, &ServerMessage::UserKicked(UserKickedPayload {
        user_id: payload.user_id,
        username: target.username,
    }));

    Ok(())
}

async fn handle_ban_user(
    session_id: Uuid,
    payload: BanUserPayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let banner_user_id = state.session_manager.get_session(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;

    let role = state.session_manager.get_user_role(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;
    if role != UserRole::Owner {
        send_error(tx, ErrorCode::Unauthorized, "Only owners can ban users")?;
        return Ok(());
    }

    if banner_user_id == payload.user_id {
        send_error(tx, ErrorCode::InvalidRequest, "You cannot ban yourself")?;
        return Ok(());
    }

    let target = match state.db.get_user(payload.user_id)? {
        Some(u) => u,
        None => {
            send_error(tx, ErrorCode::UserNotFound, "User not found")?;
            return Ok(());
        }
    };

    let ip = target.ip_address.clone().unwrap_or_else(|| "0.0.0.0".to_string());

    // If the user is online, notify them and drop their session first
    if let Some(target_sid) = state.session_manager.get_session_id_for_user(payload.user_id) {
        let _ = state.session_manager.send_to_session(
            target_sid,
            Message::Text(serde_json::to_string(&ServerMessage::Error(ErrorPayload {
                code: ErrorCode::Banned,
                message: "You have been banned from this server".to_string(),
            })).unwrap()),
        );
        state.session_manager.remove_session(target_sid);
    }

    // Create ban record
    state.db.create_ban(
        payload.user_id,
        &target.username,
        &ip,
        target.device_public_key.as_deref(),
        payload.reason,
        banner_user_id,
    )?;

    info!("User {} banned by {}", target.username, banner_user_id);

    broadcast_message(&state.session_manager, &ServerMessage::UserBanned(UserBannedPayload {
        user_id: payload.user_id,
        username: target.username,
    }));

    Ok(())
}

async fn handle_unban_user(
    session_id: Uuid,
    payload: UnbanUserPayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let role = state.session_manager.get_user_role(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;
    if role != UserRole::Owner {
        send_error(tx, ErrorCode::Unauthorized, "Only owners can revoke bans")?;
        return Ok(());
    }

    state.db.remove_ban(payload.ban_id)?;
    info!("Ban {} revoked", payload.ban_id);

    let bans = state.db.list_bans()?;
    send_message(tx, &ServerMessage::BanList(BanListPayload { bans }))?;

    Ok(())
}

async fn handle_mute_user(
    session_id: Uuid,
    payload: MuteUserPayload,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let role = state.session_manager.get_user_role(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;
    if role != UserRole::Owner {
        send_error(tx, ErrorCode::Unauthorized, "Only owners can mute users")?;
        return Ok(());
    }

    if state.db.get_user(payload.user_id)?.is_none() {
        send_error(tx, ErrorCode::UserNotFound, "User not found")?;
        return Ok(());
    }

    state.db.set_user_mute(payload.user_id, payload.mute_text, payload.mute_voice)?;
    info!("User {} mute updated: text={} voice={}", payload.user_id, payload.mute_text, payload.mute_voice);

    broadcast_message(&state.session_manager, &ServerMessage::UserMuteUpdated(UserMuteUpdatedPayload {
        user_id: payload.user_id,
        is_text_muted: payload.mute_text,
        is_voice_muted: payload.mute_voice,
    }));

    Ok(())
}

async fn handle_get_ban_list(
    session_id: Uuid,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let role = state.session_manager.get_user_role(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;
    if role != UserRole::Owner {
        send_error(tx, ErrorCode::Unauthorized, "Only owners can view the ban list")?;
        return Ok(());
    }

    let bans = state.db.list_bans()?;
    send_message(tx, &ServerMessage::BanList(BanListPayload { bans }))?;
    Ok(())
}

async fn handle_get_kick_log(
    session_id: Uuid,
    state: &Arc<AppState>,
    tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let role = state.session_manager.get_user_role(session_id)
        .ok_or_else(|| anyhow::anyhow!("Session not found"))?;
    if role != UserRole::Owner {
        send_error(tx, ErrorCode::Unauthorized, "Only owners can view the kick log")?;
        return Ok(());
    }

    let entries = state.db.list_kick_log()?;
    send_message(tx, &ServerMessage::KickLog(KickLogPayload { entries }))?;
    Ok(())
}