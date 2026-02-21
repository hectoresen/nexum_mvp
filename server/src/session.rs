use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use uuid::Uuid;
use tokio::sync::mpsc;
use axum::extract::ws::Message;

use crate::models::{User, UserRole};

#[derive(Clone)]
pub struct SessionManager {
    sessions: Arc<RwLock<HashMap<Uuid, Session>>>,
    user_channels: Arc<RwLock<HashMap<Uuid, Uuid>>>, // user_id -> text_channel_id
    voice_channels: Arc<RwLock<HashMap<Uuid, Vec<Uuid>>>>, // channel_id -> [user_ids]
}

pub struct Session {
    pub session_id: Uuid,
    pub user_id: Uuid,
    pub username: String,
    pub role: UserRole,
    pub tx: mpsc::UnboundedSender<Message>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            user_channels: Arc::new(RwLock::new(HashMap::new())),
            voice_channels: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    // ========================================================================
    // Session Management
    // ========================================================================

    pub fn create_session(
        &self,
        user: User,
        tx: mpsc::UnboundedSender<Message>,
    ) -> Uuid {
        let session_id = Uuid::new_v4();
        
        let session = Session {
            session_id,
            user_id: user.id,
            username: user.username,
            role: user.role,
            tx,
        };

        let mut sessions = self.sessions.write().unwrap();
        sessions.insert(session_id, session);

        session_id
    }

    pub fn get_session(&self, session_id: Uuid) -> Option<Uuid> {
        let sessions = self.sessions.read().unwrap();
        sessions.get(&session_id).map(|s| s.user_id)
    }

    pub fn get_user_role(&self, session_id: Uuid) -> Option<UserRole> {
        let sessions = self.sessions.read().unwrap();
        sessions.get(&session_id).map(|s| s.role.clone())
    }

    pub fn remove_session(&self, session_id: Uuid) {
        let mut sessions = self.sessions.write().unwrap();
        if let Some(session) = sessions.remove(&session_id) {
            // Clean up voice channel membership
            self.leave_voice_channel_internal(session.user_id);
        }
    }

    pub fn send_to_session(&self, session_id: Uuid, message: Message) -> bool {
        let sessions = self.sessions.read().unwrap();
        if let Some(session) = sessions.get(&session_id) {
            session.tx.send(message).is_ok()
        } else {
            false
        }
    }

    pub fn send_to_user(&self, user_id: Uuid, message: Message) -> bool {
        let sessions = self.sessions.read().unwrap();
        for session in sessions.values() {
            if session.user_id == user_id {
                return session.tx.send(message).is_ok();
            }
        }
        false
    }

    pub fn broadcast(&self, message: Message) {
        let sessions = self.sessions.read().unwrap();
        for session in sessions.values() {
            let _ = session.tx.send(message.clone());
        }
    }

    pub fn count_active_sessions(&self) -> usize {
        let sessions = self.sessions.read().unwrap();
        sessions.len()
    }

    // ========================================================================
    // Channel Management
    // ========================================================================

    pub fn join_channel(&self, user_id: Uuid, channel_id: Uuid) {
        let mut user_channels = self.user_channels.write().unwrap();
        user_channels.insert(user_id, channel_id);
    }

    pub fn leave_channel(&self, user_id: Uuid) {
        let mut user_channels = self.user_channels.write().unwrap();
        user_channels.remove(&user_id);
    }

    pub fn get_channel_members(&self, channel_id: Uuid) -> Vec<Uuid> {
        let user_channels = self.user_channels.read().unwrap();
        user_channels
            .iter()
            .filter(|(_, ch_id)| **ch_id == channel_id)
            .map(|(user_id, _)| *user_id)
            .collect()
    }

    pub fn broadcast_to_channel(&self, channel_id: Uuid, message: Message) {
        let members = self.get_channel_members(channel_id);
        let sessions = self.sessions.read().unwrap();
        
        for session in sessions.values() {
            if members.contains(&session.user_id) {
                let _ = session.tx.send(message.clone());
            }
        }
    }

    // ========================================================================
    // Voice Channel Management
    // ========================================================================

    pub fn join_voice_channel(&self, user_id: Uuid, channel_id: Uuid) -> bool {
        // First, leave any existing voice channel
        self.leave_voice_channel_internal(user_id);

        let mut voice_channels = self.voice_channels.write().unwrap();
        let members = voice_channels.entry(channel_id).or_insert_with(Vec::new);
        
        if !members.contains(&user_id) {
            members.push(user_id);
            true
        } else {
            false
        }
    }

    pub fn leave_voice_channel(&self, user_id: Uuid, channel_id: Uuid) {
        let mut voice_channels = self.voice_channels.write().unwrap();
        if let Some(members) = voice_channels.get_mut(&channel_id) {
            members.retain(|id| *id != user_id);
            if members.is_empty() {
                voice_channels.remove(&channel_id);
            }
        }
    }

    fn leave_voice_channel_internal(&self, user_id: Uuid) {
        let mut voice_channels = self.voice_channels.write().unwrap();
        let channels_to_update: Vec<Uuid> = voice_channels
            .iter()
            .filter(|(_, members)| members.contains(&user_id))
            .map(|(ch_id, _)| *ch_id)
            .collect();

        for channel_id in channels_to_update {
            if let Some(members) = voice_channels.get_mut(&channel_id) {
                members.retain(|id| *id != user_id);
                if members.is_empty() {
                    voice_channels.remove(&channel_id);
                }
            }
        }
    }

    pub fn get_voice_channel_members(&self, channel_id: Uuid) -> Vec<Uuid> {
        let voice_channels = self.voice_channels.read().unwrap();
        voice_channels
            .get(&channel_id)
            .map(|members| members.clone())
            .unwrap_or_else(Vec::new)
    }

    pub fn get_user_voice_channel(&self, user_id: Uuid) -> Option<Uuid> {
        let voice_channels = self.voice_channels.read().unwrap();
        for (channel_id, members) in voice_channels.iter() {
            if members.contains(&user_id) {
                return Some(*channel_id);
            }
        }
        None
    }

    pub fn get_session_by_id(&self, session_id: Uuid) -> Option<Uuid> {
        let sessions = self.sessions.read().unwrap();
        sessions.get(&session_id).map(|s| s.user_id)
    }
}
