use anyhow::{Context, Result};
use rusqlite::{Connection, params, OptionalExtension};
use std::path::Path;
use std::sync::{Arc, Mutex};
use uuid::Uuid;
use chrono::Utc;

use crate::models::{User, UserRole, Channel, ChannelType, Message, Category, DirectMessage};

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
                ip_address TEXT,
                avatar_url TEXT,
                avatar_path TEXT,
                avatar_version INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS channels (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                max_users INTEGER,
                category_id TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                position INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                deleted_by_user_id TEXT,
                deleted_at TEXT,
                FOREIGN KEY (channel_id) REFERENCES channels(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (deleted_by_user_id) REFERENCES users(id)
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

            CREATE TABLE IF NOT EXISTS direct_messages (
                id TEXT PRIMARY KEY,
                sender_id TEXT NOT NULL,
                recipient_id TEXT NOT NULL,
                encrypted_content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (sender_id) REFERENCES users(id),
                FOREIGN KEY (recipient_id) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
            CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
            CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_id);
            CREATE INDEX IF NOT EXISTS idx_dm_recipient ON direct_messages(recipient_id);
            CREATE INDEX IF NOT EXISTS idx_dm_created ON direct_messages(created_at);
            "#
        )?;

        // Migration: Add message deletion columns if they don't exist
        let columns: Vec<String> = conn.prepare("PRAGMA table_info(messages)")?
            .query_map([], |row| row.get(1))?
            .collect::<Result<Vec<_>, _>>()?;
        
        if !columns.contains(&"deleted_by_user_id".to_string()) {
            conn.execute("ALTER TABLE messages ADD COLUMN deleted_by_user_id TEXT", [])?;
        }
        if !columns.contains(&"deleted_at".to_string()) {
            conn.execute("ALTER TABLE messages ADD COLUMN deleted_at TEXT", [])?;
        }
        if !columns.contains(&"edited_at".to_string()) {
            conn.execute("ALTER TABLE messages ADD COLUMN edited_at TEXT", [])?;
        }

        // Migration: Add category_id to channels if it doesn't exist
        let channel_columns: Vec<String> = conn.prepare("PRAGMA table_info(channels)")?
            .query_map([], |row| row.get(1))?
            .collect::<Result<Vec<_>, _>>()?;
        if !channel_columns.contains(&"category_id".to_string()) {
            conn.execute("ALTER TABLE channels ADD COLUMN category_id TEXT", [])?;
        }

        // Ensure categories table exists (may be missing on old DBs)
        conn.execute_batch(
            r#"CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                position INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );"#
        )?;

        Ok(())
    }

    // ========================================================================
    // User Operations
    // ========================================================================

    pub fn create_user(&self, username: &str, role: UserRole, ip_address: Option<String>) -> Result<User> {
        let user = User {
            id: Uuid::new_v4(),
            username: username.to_string(),
            role,
            ip_address: ip_address.clone(),
            avatar_url: None,
            avatar_path: None,
            avatar_version: 0,
            created_at: Utc::now(),
        };

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO users (id, username, role, ip_address, avatar_url, avatar_path, avatar_version, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                user.id.to_string(),
                &user.username,
                user.role.to_string(),
                ip_address,
                user.avatar_url,
                user.avatar_path,
                user.avatar_version,
                user.created_at.to_rfc3339(),
            ],
        )?;

        Ok(user)
    }

    pub fn get_user(&self, user_id: Uuid) -> Result<Option<User>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, username, role, ip_address, avatar_url, avatar_path, avatar_version, created_at FROM users WHERE id = ?1"
        )?;

        let user = stmt.query_row(params![user_id.to_string()], |row| {
            Ok(User {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                username: row.get(1)?,
                role: UserRole::from_string(&row.get::<_, String>(2)?),
                ip_address: row.get(3)?,
                avatar_url: row.get(4)?,
                avatar_path: row.get(5)?,
                avatar_version: row.get(6)?,
                created_at: row.get::<_, String>(7)?.parse().unwrap(),
            })
        }).optional()?;

        Ok(user)
    }

    pub fn get_user_by_username(&self, username: &str) -> Result<Option<User>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, username, role, ip_address, avatar_url, avatar_path, avatar_version, created_at FROM users WHERE username = ?1"
        )?;

        let user = stmt.query_row(params![username], |row| {
            Ok(User {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                username: row.get(1)?,
                role: UserRole::from_string(&row.get::<_, String>(2)?),
                ip_address: row.get(3)?,
                avatar_url: row.get(4)?,
                avatar_path: row.get(5)?,
                avatar_version: row.get(6)?,
                created_at: row.get::<_, String>(7)?.parse().unwrap(),
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

    pub fn update_user_role(&self, user_id: Uuid, role: UserRole) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE users SET role = ?1 WHERE id = ?2",
            params![role.to_string(), user_id.to_string()],
        )?;
        Ok(())
    }

    pub fn update_user_avatar(&self, user_id: Uuid, avatar_url: Option<String>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE users SET avatar_url = ?1 WHERE id = ?2",
            params![avatar_url, user_id.to_string()],
        )?;
        Ok(())
    }

    pub fn update_avatar_path(&self, user_id: Uuid, avatar_path: String) -> Result<i32> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE users SET avatar_path = ?1, avatar_version = avatar_version + 1 WHERE id = ?2",
            params![avatar_path, user_id.to_string()],
        )?;
        
        // Get the new version number
        let version: i32 = conn.query_row(
            "SELECT avatar_version FROM users WHERE id = ?1",
            params![user_id.to_string()],
            |row| row.get(0),
        )?;
        
        Ok(version)
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

    pub fn list_users(&self) -> Result<Vec<User>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, username, role, ip_address, avatar_url, avatar_path, avatar_version, created_at FROM users ORDER BY created_at"
        )?;
        let users = stmt.query_map([], |row| {
            Ok(User {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                username: row.get(1)?,
                role: UserRole::from_string(&row.get::<_, String>(2)?),
                ip_address: row.get(3)?,
                avatar_url: row.get(4)?,
                avatar_path: row.get(5)?,
                avatar_version: row.get(6)?,
                created_at: row.get::<_, String>(7)?.parse().unwrap(),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
        Ok(users)
    }

    pub fn get_user_by_ip(&self, ip_address: &str) -> Result<Option<User>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, username, role, ip_address, avatar_url, avatar_path, avatar_version, created_at FROM users WHERE ip_address = ?1"
        )?;

        let user = stmt.query_row(params![ip_address], |row| {
            Ok(User {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                username: row.get(1)?,
                role: UserRole::from_string(&row.get::<_, String>(2)?),
                ip_address: row.get(3)?,
                avatar_url: row.get(4)?,
                avatar_path: row.get(5)?,
                avatar_version: row.get(6)?,
                created_at: row.get::<_, String>(7)?.parse().unwrap(),
            })
        }).optional()?;

        Ok(user)
    }

    // ========================================================================
    // Channel Operations
    // ========================================================================

    pub fn create_channel(&self, name: &str, channel_type: ChannelType, max_users: Option<usize>, category_id: Option<Uuid>) -> Result<Channel> {
        let channel = Channel {
            id: Uuid::new_v4(),
            name: name.to_string(),
            channel_type,
            max_users,
            category_id,
            created_at: Utc::now(),
        };

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO channels (id, name, type, max_users, category_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                channel.id.to_string(),
                &channel.name,
                channel.channel_type.to_string(),
                channel.max_users.map(|u| u as i64),
                channel.category_id.map(|id| id.to_string()),
                channel.created_at.to_rfc3339(),
            ],
        )?;

        Ok(channel)
    }

    pub fn get_channel(&self, channel_id: Uuid) -> Result<Option<Channel>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, type, max_users, category_id, created_at FROM channels WHERE id = ?1"
        )?;

        let channel = stmt.query_row(params![channel_id.to_string()], |row| {
            let category_id_str: Option<String> = row.get(4)?;
            Ok(Channel {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                name: row.get(1)?,
                channel_type: ChannelType::from_string(&row.get::<_, String>(2)?),
                max_users: row.get::<_, Option<i64>>(3)?.map(|u| u as usize),
                category_id: category_id_str.and_then(|s| Uuid::parse_str(&s).ok()),
                created_at: row.get::<_, String>(5)?.parse().unwrap(),
            })
        }).optional()?;

        Ok(channel)
    }

    pub fn list_channels(&self) -> Result<Vec<Channel>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, type, max_users, category_id, created_at FROM channels ORDER BY created_at"
        )?;

        let channels = stmt.query_map([], |row| {
            let category_id_str: Option<String> = row.get(4)?;
            Ok(Channel {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                name: row.get(1)?,
                channel_type: ChannelType::from_string(&row.get::<_, String>(2)?),
                max_users: row.get::<_, Option<i64>>(3)?.map(|u| u as usize),
                category_id: category_id_str.and_then(|s| Uuid::parse_str(&s).ok()),
                created_at: row.get::<_, String>(5)?.parse().unwrap(),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(channels)
    }

    pub fn delete_channel_messages(&self, channel_id: Uuid) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM messages WHERE channel_id = ?1",
            params![channel_id.to_string()],
        )?;
        Ok(())
    }

    pub fn delete_channel(&self, channel_id: Uuid) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM channels WHERE id = ?1",
            params![channel_id.to_string()],
        )?;
        Ok(())
    }

    pub fn rename_channel(&self, channel_id: Uuid, new_name: &str) -> Result<Channel> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE channels SET name = ?1 WHERE id = ?2",
            params![new_name, channel_id.to_string()],
        )?;
        let mut stmt = conn.prepare(
            "SELECT id, name, type, max_users, category_id, created_at FROM channels WHERE id = ?1"
        )?;
        let channel = stmt.query_row(params![channel_id.to_string()], |row| {
            let category_id_str: Option<String> = row.get(4)?;
            Ok(Channel {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                name: row.get(1)?,
                channel_type: ChannelType::from_string(&row.get::<_, String>(2)?),
                max_users: row.get::<_, Option<i64>>(3)?.map(|u| u as usize),
                category_id: category_id_str.and_then(|s| Uuid::parse_str(&s).ok()),
                created_at: row.get::<_, String>(5)?.parse().unwrap(),
            })
        })?;
        Ok(channel)
    }

    pub fn update_channel_category(&self, channel_id: Uuid, category_id: Option<Uuid>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE channels SET category_id = ?1 WHERE id = ?2",
            params![category_id.map(|id| id.to_string()), channel_id.to_string()],
        )?;
        Ok(())
    }

    // ========================================================================
    // Category Operations
    // ========================================================================

    pub fn create_category(&self, name: &str) -> Result<Category> {
        let conn = self.conn.lock().unwrap();
        let position: i64 = conn.query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM categories",
            [],
            |row| row.get(0),
        ).unwrap_or(0);

        let category = Category {
            id: Uuid::new_v4(),
            name: name.to_string(),
            position,
            created_at: Utc::now(),
        };

        conn.execute(
            "INSERT INTO categories (id, name, position, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![
                category.id.to_string(),
                &category.name,
                category.position,
                category.created_at.to_rfc3339(),
            ],
        )?;

        Ok(category)
    }

    pub fn list_categories(&self) -> Result<Vec<Category>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, position, created_at FROM categories ORDER BY position ASC, created_at ASC"
        )?;

        let categories = stmt.query_map([], |row| {
            Ok(Category {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                name: row.get(1)?,
                position: row.get(2)?,
                created_at: row.get::<_, String>(3)?.parse().unwrap(),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(categories)
    }

    pub fn delete_category(&self, category_id: Uuid) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        // Remove category from channels first (set to NULL)
        conn.execute(
            "UPDATE channels SET category_id = NULL WHERE category_id = ?1",
            params![category_id.to_string()],
        )?;
        conn.execute(
            "DELETE FROM categories WHERE id = ?1",
            params![category_id.to_string()],
        )?;
        Ok(())
    }

    pub fn rename_category(&self, category_id: Uuid, new_name: &str) -> Result<Category> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE categories SET name = ?1 WHERE id = ?2",
            params![new_name, category_id.to_string()],
        )?;
        let mut stmt = conn.prepare(
            "SELECT id, name, position, created_at FROM categories WHERE id = ?1"
        )?;
        let category = stmt.query_row(params![category_id.to_string()], |row| {
            Ok(Category {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                name: row.get(1)?,
                position: row.get(2)?,
                created_at: row.get::<_, String>(3)?.parse().unwrap(),
            })
        })?;
        Ok(category)
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
            deleted_by_user_id: None,
            deleted_at: None,
            edited_at: None,
        };

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO messages (id, channel_id, user_id, content, created_at, deleted_by_user_id, deleted_at, edited_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                message.id.to_string(),
                message.channel_id.to_string(),
                message.user_id.to_string(),
                &message.content,
                message.created_at.to_rfc3339(),
                None::<String>,
                None::<String>,
                None::<String>,
            ],
        )?;

        Ok(message)
    }

    pub fn get_recent_messages(&self, channel_id: Uuid, limit: usize) -> Result<Vec<Message>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, channel_id, user_id, content, created_at, deleted_by_user_id, deleted_at, edited_at 
             FROM messages 
             WHERE channel_id = ?1 
             ORDER BY created_at DESC 
             LIMIT ?2"
        )?;

        let messages = stmt.query_map(params![channel_id.to_string(), limit as i64], |row| {
            let deleted_by_user_id: Option<String> = row.get(5)?;
            let deleted_at: Option<String> = row.get(6)?;
            let edited_at: Option<String> = row.get(7)?;
            
            Ok(Message {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                channel_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap(),
                user_id: Uuid::parse_str(&row.get::<_, String>(2)?).unwrap(),
                content: row.get(3)?,
                created_at: row.get::<_, String>(4)?.parse().unwrap(),
                deleted_by_user_id: deleted_by_user_id.and_then(|s| Uuid::parse_str(&s).ok()),
                deleted_at: deleted_at.and_then(|s| s.parse().ok()),
                edited_at: edited_at.and_then(|s| s.parse().ok()),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(messages)
    }

    pub fn get_message_history(&self, channel_id: Uuid, limit: usize) -> Result<Vec<(Message, String, Option<String>, Option<String>, i32)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT m.id, m.channel_id, m.user_id, m.content, m.created_at, m.deleted_by_user_id, m.deleted_at, m.edited_at, u.username, u.avatar_url, u.avatar_path, u.avatar_version
             FROM messages m
             JOIN users u ON m.user_id = u.id
             WHERE m.channel_id = ?1 
             ORDER BY m.created_at ASC 
             LIMIT ?2"
        )?;

        let rows = stmt.query_map(params![channel_id.to_string(), limit as i64], |row| {
            let deleted_by_user_id: Option<String> = row.get(5)?;
            let deleted_at: Option<String> = row.get(6)?;
            let edited_at: Option<String> = row.get(7)?;
            
            let message = Message {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                channel_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap(),
                user_id: Uuid::parse_str(&row.get::<_, String>(2)?).unwrap(),
                content: row.get(3)?,
                created_at: row.get::<_, String>(4)?.parse().unwrap(),
                deleted_by_user_id: deleted_by_user_id.and_then(|s| Uuid::parse_str(&s).ok()),
                deleted_at: deleted_at.and_then(|s| s.parse().ok()),
                edited_at: edited_at.and_then(|s| s.parse().ok()),
            };
            let username: String = row.get(8)?;
            let avatar_url: Option<String> = row.get(9)?;
            let avatar_path: Option<String> = row.get(10)?;
            let avatar_version: i32 = row.get(11)?;
            Ok((message, username, avatar_url, avatar_path, avatar_version))
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(rows)
    }

    pub fn delete_message(&self, message_id: Uuid, deleted_by_user_id: Uuid) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let deleted_at = Utc::now();
        
        conn.execute(
            "UPDATE messages SET deleted_by_user_id = ?1, deleted_at = ?2 WHERE id = ?3",
            params![
                deleted_by_user_id.to_string(),
                deleted_at.to_rfc3339(),
                message_id.to_string(),
            ],
        )?;

        Ok(())
    }

    pub fn get_message(&self, message_id: Uuid) -> Result<Option<Message>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, channel_id, user_id, content, created_at, deleted_by_user_id, deleted_at, edited_at FROM messages WHERE id = ?1"
        )?;

        let message = stmt.query_row(params![message_id.to_string()], |row| {
            let deleted_by_user_id: Option<String> = row.get(5)?;
            let deleted_at: Option<String> = row.get(6)?;
            let edited_at: Option<String> = row.get(7)?;
            
            Ok(Message {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                channel_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap(),
                user_id: Uuid::parse_str(&row.get::<_, String>(2)?).unwrap(),
                content: row.get(3)?,
                created_at: row.get::<_, String>(4)?.parse().unwrap(),
                deleted_by_user_id: deleted_by_user_id.and_then(|s| Uuid::parse_str(&s).ok()),
                deleted_at: deleted_at.and_then(|s| s.parse().ok()),
                edited_at: edited_at.and_then(|s| s.parse().ok()),
            })
        }).optional()?;

        Ok(message)
    }

    pub fn update_message_content(&self, message_id: Uuid, content: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let edited_at = Utc::now();
        
        conn.execute(
            "UPDATE messages SET content = ?1, edited_at = ?2 WHERE id = ?3",
            params![
                content,
                edited_at.to_rfc3339(),
                message_id.to_string(),
            ],
        )?;

        Ok(())
    }

    // ========================================================================
    // Direct Message Operations
    // ========================================================================

    /// Persist an encrypted direct message and return the stored record.
    pub fn save_dm(
        &self,
        sender_id: Uuid,
        recipient_id: Uuid,
        encrypted_content: &str,
    ) -> Result<DirectMessage> {
        let dm = DirectMessage {
            id: Uuid::new_v4(),
            sender_id,
            recipient_id,
            encrypted_content: encrypted_content.to_string(),
            created_at: Utc::now(),
        };

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO direct_messages (id, sender_id, recipient_id, encrypted_content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                dm.id.to_string(),
                dm.sender_id.to_string(),
                dm.recipient_id.to_string(),
                &dm.encrypted_content,
                dm.created_at.to_rfc3339(),
            ],
        )?;

        Ok(dm)
    }

    /// Retrieve the last 100 DMs between two users, ordered oldest-first.
    pub fn get_dm_history(&self, user_a: Uuid, user_b: Uuid) -> Result<Vec<DirectMessage>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, sender_id, recipient_id, encrypted_content, created_at \
             FROM direct_messages \
             WHERE (sender_id = ?1 AND recipient_id = ?2) \
                OR (sender_id = ?2 AND recipient_id = ?1) \
             ORDER BY created_at ASC \
             LIMIT 100",
        )?;

        let rows = stmt.query_map(
            params![user_a.to_string(), user_b.to_string()],
            |row| {
                Ok(DirectMessage {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                    sender_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap(),
                    recipient_id: Uuid::parse_str(&row.get::<_, String>(2)?).unwrap(),
                    encrypted_content: row.get(3)?,
                    created_at: row.get::<_, String>(4)?.parse().unwrap(),
                })
            },
        )?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(rows)
    }
}
