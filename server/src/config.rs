use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use rand::Rng;
use rand::distributions::Alphanumeric;
use dialoguer::{Input, Select, Password, Confirm};

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
    /// Optional join password. If set and non-empty the server is private:
    /// every CONNECT must supply a matching join_password field.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub join_password: Option<String>,
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
                join_password: None,
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
    /// Returns the canonical server data directory: ~/.nexum/server/
    /// This is the same path used by the Tauri client, so standalone and
    /// client-managed servers share the same config and database.
    fn nexum_server_dir() -> Option<PathBuf> {
        dirs::home_dir().map(|h| h.join(".nexum").join("server"))
    }

    pub fn load(non_interactive: bool, admin_password: Option<String>, data_path: Option<String>, server_name: Option<String>, join_password: Option<String>) -> Result<Self> {
        // Resolve config path:
        //   1. CONFIG_PATH env var (explicit override, keeps legacy behaviour)
        //   2. ~/.nexum/server/server.toml — matches what the Tauri client uses,
        //      so standalone and client-managed servers share the same data.
        let config_path = if let Ok(p) = std::env::var("CONFIG_PATH") {
            PathBuf::from(p)
        } else {
            let server_dir = Self::nexum_server_dir()
                .context("Could not determine home directory for ~/.nexum/server/")?;
            std::fs::create_dir_all(&server_dir)
                .with_context(|| format!("Failed to create server directory: {}", server_dir.display()))?;
            server_dir.join("server.toml")
        };

        if let Ok(contents) = fs::read_to_string(&config_path) {
            toml::from_str(&contents)
                .with_context(|| format!("Failed to parse config file: {}", config_path.display()))
        } else {
            // First time setup
            let mut config = Config::default();

            // Resolve data directory
            if let Some(path) = &data_path {
                // Explicit --data-path takes priority
                config.server.data_path = PathBuf::from(path);
            } else if let Some(server_dir) = Self::nexum_server_dir() {
                // Default: store data next to config in ~/.nexum/server/data
                config.server.data_path = server_dir.join("data");
            }
            // else fall back to the struct default ("./data") already set above

            let (name, password, jp) = if non_interactive {
                let pwd = admin_password.unwrap_or_else(|| Self::generate_secure_password());
                let nm = server_name.unwrap_or_else(|| "My Nexum Server".to_string());
                (nm, pwd, join_password)
            } else {
                // Interactive: full setup wizard
                Self::prompt_for_setup(admin_password)?
            };

            config.server.name = name.clone();
            config.server.admin_password = password.clone();
            config.server.join_password = jp.clone();

            // Save config
            let config_contents = toml::to_string_pretty(&config)?;
            fs::write(&config_path, &config_contents)
                .with_context(|| format!("Failed to write config file: {}", config_path.display()))?;

            // Write example config alongside it
            let example_path = config_path.with_file_name("server.example.toml");
            let example_config = toml::to_string_pretty(&Self::default())?;
            if let Err(e) = fs::write(&example_path, example_config) {
                tracing::warn!("Could not write example config: {}", e);
            }

            if !non_interactive {
                println!("\n{}", "=".repeat(70));
                println!("✅ SERVER CONFIGURATION SAVED");
                println!("{}", "=".repeat(70));
                println!();
                println!("Configuration file: {}", config_path.display());
                println!("Server name:        {}", name);
                println!("Visibility:         {}", if jp.is_some() { "🔒 Private (join password required)" } else { "🌐 Public" });
                println!("Admin password:     {}", password);
                println!();
                println!("⚠️  Keep this password secure! You'll need it to authenticate as admin.");
                println!("{}", "=".repeat(70));
                println!();
            }

            Ok(config)
        }
    }

    /// Interactive first-time setup wizard.
    /// Returns (server_name, admin_password, join_password).
    fn prompt_for_setup(provided_password: Option<String>) -> Result<(String, String, Option<String>)> {
        println!("\n{}", "=".repeat(70));
        println!("🔒 SERVER FIRST-TIME SETUP");
        println!("{}", "=".repeat(70));
        println!();

        // ── Server name ─────────────────────────────────────────────────────
        let name: String = Input::<String>::new()
            .with_prompt("Server name")
            .default("My Nexum Server".to_string())
            .interact_text()?;

        println!();

        // ── Admin password ───────────────────────────────────────────────────
        println!("Set an admin password for this server.");
        println!();

        let password = if let Some(pwd) = provided_password {
            pwd
        } else {
            let options = vec![
                "Generate a secure random password (recommended)",
                "Enter a custom password",
            ];

            let selection = Select::new()
                .with_prompt("Choose password setup method")
                .items(&options)
                .default(0)
                .interact()?;

            match selection {
                0 => {
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
                        std::io::stdin().read_line(&mut String::new())?;
                    }

                    pwd
                }
                1 => {
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
            }
        };

        println!();

        // ── Server visibility ────────────────────────────────────────────────
        let visibility_options = vec![
            "🌐 Public  — anyone can join",
            "🔒 Private — require a join password",
        ];

        let visibility = Select::new()
            .with_prompt("Server visibility")
            .items(&visibility_options)
            .default(0)
            .interact()?;

        let join_password = if visibility == 1 {
            println!();
            let jp = Password::new()
                .with_prompt("Enter join password")
                .with_confirmation("Confirm join password", "Passwords don't match")
                .interact()?;
            if jp.is_empty() { None } else { Some(jp) }
        } else {
            None
        };

        Ok((name, password, join_password))
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
