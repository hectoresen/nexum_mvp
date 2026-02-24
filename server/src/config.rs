use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use rand::Rng;
use rand::distributions::Alphanumeric;
use dialoguer::{Select, Password, Confirm};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub limits: LimitsConfig,
    pub persistence: PersistenceConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub name: String,
    pub host: String,
    pub ws_port: u16,
    pub udp_port: u16,
    pub data_path: PathBuf,
    pub session_timeout_secs: u64,
    pub ping_interval_secs: u64,
    pub admin_password: String,
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
                name: "My Voice Server".to_string(),
                host: "0.0.0.0".to_string(),
                ws_port: 8080,
                udp_port: 9000,
                data_path: PathBuf::from("./data"),
                session_timeout_secs: 60,
                ping_interval_secs: 30,
                admin_password: "admin".to_string(),
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
    pub fn load(non_interactive: bool, admin_password: Option<String>, data_path: Option<String>) -> Result<Self> {
        // Try to load from file, otherwise use defaults
        let config_path = std::env::var("CONFIG_PATH")
            .unwrap_or_else(|_| "server.toml".to_string());

        if let Ok(contents) = fs::read_to_string(&config_path) {
            toml::from_str(&contents)
                .with_context(|| format!("Failed to parse config file: {}", config_path))
        } else {
            // First time setup
            let mut config = Config::default();
            
            // Override data_path if provided
            if let Some(path) = data_path {
                config.server.data_path = PathBuf::from(path);
            }
            
            let password = if let Some(pwd) = admin_password {
                // Password provided via command line
                pwd
            } else if non_interactive {
                // Non-interactive mode: generate random password
                Self::generate_secure_password()
            } else {
                // Interactive mode: ask user
                Self::prompt_for_password()?
            };
            
            let mut config = Self::default();
            config.server.admin_password = password.clone();
            
            // Save config to server.toml
            let config_contents = toml::to_string_pretty(&config)?;
            fs::write(&config_path, &config_contents)
                .with_context(|| format!("Failed to write config file: {}", config_path))?;
            
            // Also create example config
            let example_config = toml::to_string_pretty(&Self::default())?;
            if let Err(e) = fs::write("server.example.toml", example_config) {
                tracing::warn!("Could not write example config: {}", e);
            }
            
            if !non_interactive {
                // Print confirmation
                println!("\n{}", "=".repeat(70));
                println!("✅ SERVER CONFIGURATION SAVED");
                println!("{}", "=".repeat(70));
                println!();
                println!("Configuration file created: {}", config_path);
                println!("Admin password: {}", password);
                println!();
                println!("⚠️  Keep this password secure! You'll need it to authenticate as admin.");
                println!("{}", "=".repeat(70));
                println!();
            }
            
            Ok(config)
        }
    }

    fn prompt_for_password() -> Result<String> {
        println!("\n{}", "=".repeat(70));
        println!("🔐 SERVER FIRST-TIME SETUP");
        println!("{}", "=".repeat(70));
        println!();
        println!("You need to set an admin password for this server.");
        println!();

        let options = vec![
            "Generate a secure random password (recommended)",
            "Enter a custom password",
        ];

        let selection = Select::new()
            .with_prompt("Choose password setup method")
            .items(&options)
            .default(0)
            .interact()?;

        let password = match selection {
            0 => {
                // Generate random password
                let pwd = Self::generate_secure_password();
                println!();
                println!("Generated password: {}", pwd);
                println!();
                println!("⚠️  Save this password! You won't be able to see it again.");
                println!("   (You can find it later in server.toml if needed)");
                println!();
                
                let confirm = Confirm::new()
                    .with_prompt("Have you saved the password?")
                    .default(false)
                    .interact()?;
                
                if !confirm {
                    println!();
                    println!("Password: {}", pwd);
                    println!();
                    std::io::stdin().read_line(&mut String::new())?; // Wait for Enter
                }
                
                pwd
            }
            1 => {
                // Custom password
                println!();
                let pwd = Password::new()
                    .with_prompt("Enter admin password")
                    .with_confirmation("Confirm password", "Passwords don't match")
                    .interact()?;
                
                if pwd.len() < 8 {
                    anyhow::bail!("Password must be at least 8 characters long");
                }
                
                pwd
            }
            _ => unreachable!(),
        };

        Ok(password)
    }

    fn generate_secure_password() -> String {
        // Generate a 16-character alphanumeric password
        rand::thread_rng()
            .sample_iter(&Alphanumeric)
            .take(16)
            .map(char::from)
            .collect()
    }

    pub fn save(&self, path: &str) -> Result<()> {
        let contents = toml::to_string_pretty(self)?;
        fs::write(path, contents)?;
        Ok(())
    }
}
