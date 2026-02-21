use anyhow::{Context, Result};
use rusqlite::{Connection, params};
use std::path::Path;
use std::sync::{Arc, Mutex};
use uuid::Uuid;
use chrono::Utc;

use crate::models::{User, UserRole, Channel, ChannelType, Message};

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new<P: AsRef<Path>>(data_path: P) -> Result<Self> {
        let data_path = data_path.as_ref();
        std::fs::create_dir_all(data_path)?;
        
        let db_path = data_path.join("server.db");
        let conn = Connection::open(db_path)
            .context("Failed to open database")?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn init(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS channels (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                max_users INTEGER,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (channel_id) REFERENCES channels(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS call_history (
                id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                duration_seconds INTEGER,
                FOREIGN KEY (channel_id) REFERENCES channels(id)
            );

            CREATE TABLE IF NOT EXISTS server_config (
                id TEXT PRIMARY KEY,
                max_users INTEGER NOT NULL,
                persistence_enabled INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
            CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
            "#
        )?;

        Ok(())
    }

    // ========================================================================
    // User Operations
    // ========================================================================

    pub fn create_user(&self, username: &str, role: UserRole) -> Result<User> {
        let user = User {
            id: Uuid::new_v4(),
            username: username.to_string(),
            role,
            created_at: Utc::now(),
        };

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO users (id, username, role, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![
                user.id.to_string(),
                &user.username,
                user.role.to_string(),
                user.created_at.to_rfc3339(),
            ],
        )?;

        Ok(user)
    }

    pub fn get_user(&self, user_id: Uuid) -> Result<Option<User>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, username, role, created_at FROM users WHERE id = ?1"
        )?;

        let user = stmt.query_row(params![user_id.to_string()], |row| {
            Ok(User {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                username: row.get(1)?,
                role: UserRole::from_string(&row.get::<_, String>(2)?),
                created_at: row.get::<_, String>(3)?.parse().unwrap(),
            })
        }).optional()?;

        Ok(user)
    }

    pub fn update_username(&self, user_id: Uuid, new_username: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE users SET username = ?1 WHERE id = ?2",
            params![new_username, user_id.to_string()],
        )?;
        Ok(())
    }

    pub fn count_users(&self) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM users",
            [],
            |row| row.get(0)
        )?;
        Ok(count as usize)
    }

    pub fn is_first_user(&self) -> Result<bool> {
        Ok(self.count_users()? == 0)
    }

    // ========================================================================
    // Channel Operations
    // ========================================================================

    pub fn create_channel(&self, name: &str, channel_type: ChannelType, max_users: Option<usize>) -> Result<Channel> {
        let channel = Channel {
            id: Uuid::new_v4(),
            name: name.to_string(),
            channel_type,
            max_users,
            created_at: Utc::now(),
        };

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO channels (id, name, type, max_users, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                channel.id.to_string(),
                &channel.name,
                channel.channel_type.to_string(),
                channel.max_users.map(|u| u as i64),
                channel.created_at.to_rfc3339(),
            ],
        )?;

        Ok(channel)
    }

    pub fn get_channel(&self, channel_id: Uuid) -> Result<Option<Channel>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, type, max_users, created_at FROM channels WHERE id = ?1"
        )?;

        let channel = stmt.query_row(params![channel_id.to_string()], |row| {
            Ok(Channel {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                name: row.get(1)?,
                channel_type: ChannelType::from_string(&row.get::<_, String>(2)?),
                max_users: row.get::<_, Option<i64>>(3)?.map(|u| u as usize),
                created_at: row.get::<_, String>(4)?.parse().unwrap(),
            })
        }).optional()?;

        Ok(channel)
    }

    pub fn list_channels(&self) -> Result<Vec<Channel>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, type, max_users, created_at FROM channels ORDER BY created_at"
        )?;

        let channels = stmt.query_map([], |row| {
            Ok(Channel {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                name: row.get(1)?,
                channel_type: ChannelType::from_string(&row.get::<_, String>(2)?),
                max_users: row.get::<_, Option<i64>>(3)?.map(|u| u as usize),
                created_at: row.get::<_, String>(4)?.parse().unwrap(),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(channels)
    }

    pub fn delete_channel(&self, channel_id: Uuid) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM channels WHERE id = ?1",
            params![channel_id.to_string()],
        )?;
        Ok(())
    }

    // ========================================================================
    // Message Operations
    // ========================================================================

    pub fn create_message(&self, channel_id: Uuid, user_id: Uuid, content: &str) -> Result<Message> {
        let message = Message {
            id: Uuid::new_v4(),
            channel_id,
            user_id,
            content: content.to_string(),
            created_at: Utc::now(),
        };

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO messages (id, channel_id, user_id, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                message.id.to_string(),
                message.channel_id.to_string(),
                message.user_id.to_string(),
                &message.content,
                message.created_at.to_rfc3339(),
            ],
        )?;

        Ok(message)
    }

    pub fn get_recent_messages(&self, channel_id: Uuid, limit: usize) -> Result<Vec<Message>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, channel_id, user_id, content, created_at 
             FROM messages 
             WHERE channel_id = ?1 
             ORDER BY created_at DESC 
             LIMIT ?2"
        )?;

        let messages = stmt.query_map(params![channel_id.to_string(), limit as i64], |row| {
            Ok(Message {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                channel_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap(),
                user_id: Uuid::parse_str(&row.get::<_, String>(2)?).unwrap(),
                content: row.get(3)?,
                created_at: row.get::<_, String>(4)?.parse().unwrap(),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(messages)
    }
}
