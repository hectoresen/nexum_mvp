use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub limits: LimitsConfig,
    pub persistence: PersistenceConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub ws_port: u16,
    pub udp_port: u16,
    pub data_path: PathBuf,
    pub session_timeout_secs: u64,
    pub ping_interval_secs: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimitsConfig {
    pub max_users: usize,
    pub max_users_per_voice_channel: usize,
    pub max_message_size: usize,
    pub rate_limit_messages_per_minute: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistenceConfig {
    pub enabled: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                host: "0.0.0.0".to_string(),
                ws_port: 8080,
                udp_port: 9000,
                data_path: PathBuf::from("./data"),
                session_timeout_secs: 60,
                ping_interval_secs: 30,
            },
            limits: LimitsConfig {
                max_users: 200,
                max_users_per_voice_channel: 100,
                max_message_size: 2000,
                rate_limit_messages_per_minute: 60,
            },
            persistence: PersistenceConfig {
                enabled: true,
            },
        }
    }
}

impl Config {
    pub fn load() -> Result<Self> {
        // Try to load from file, otherwise use defaults
        let config_path = std::env::var("CONFIG_PATH")
            .unwrap_or_else(|_| "server.toml".to_string());

        if let Ok(contents) = fs::read_to_string(&config_path) {
            toml::from_str(&contents)
                .with_context(|| format!("Failed to parse config file: {}", config_path))
        } else {
            // Use defaults and create example config file
            let config = Self::default();
            let example_config = toml::to_string_pretty(&config)?;
            
            if let Err(e) = fs::write("server.example.toml", example_config) {
                tracing::warn!("Could not write example config: {}", e);
            }
            
            Ok(config)
        }
    }

    pub fn save(&self, path: &str) -> Result<()> {
        let contents = toml::to_string_pretty(self)?;
        fs::write(path, contents)?;
        Ok(())
    }
}
