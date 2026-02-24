use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};

/// Current status of the local server
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ServerStatus {
    NotInstalled,
    Stopped,
    Starting,
    Running,
    Error,
}

/// Information about the local server
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerInfo {
    pub status: ServerStatus,
    pub installed: bool,
    pub binary_path: Option<String>,
    pub ws_port: u16,
    pub udp_port: u16,
    pub pid: Option<u32>,
}

/// Manages the local server process and state
pub struct ServerManager {
    process: Arc<Mutex<Option<Child>>>,
    status: Arc<Mutex<ServerStatus>>,
    binary_path: Arc<Mutex<Option<PathBuf>>>,
    configured_path: Arc<Mutex<Option<PathBuf>>>, // Manual configuration
}

impl ServerManager {
    pub fn new() -> Self {
        Self {
            process: Arc::new(Mutex::new(None)),
            status: Arc::new(Mutex::new(ServerStatus::NotInstalled)),
            binary_path: Arc::new(Mutex::new(None)),
            configured_path: Arc::new(Mutex::new(None)),
        }
    }

    /// Detect if the server binary exists and where it is located
    pub fn detect_server(&self) -> Result<ServerInfo> {
        tracing::info!("Starting server detection...");
        
        // First, check if user has manually configured a path
        let configured = self.configured_path.lock().unwrap();
        if let Some(manual_path) = configured.as_ref() {
            tracing::info!("Checking manually configured path: {:?}", manual_path);
            if manual_path.exists() && manual_path.is_file() {
                tracing::info!("Found server at configured path: {:?}", manual_path);
                *self.binary_path.lock().unwrap() = Some(manual_path.clone());
                *self.status.lock().unwrap() = ServerStatus::Stopped;
                
                return Ok(ServerInfo {
                    status: ServerStatus::Stopped,
                    installed: true,
                    binary_path: Some(manual_path.to_string_lossy().to_string()),
                    ws_port: 8080,
                    udp_port: 9000,
                    pid: self.get_process_pid(),
                });
            } else {
                tracing::warn!("Configured path does not exist or is not a file: {:?}", manual_path);
            }
        }
        drop(configured);

        let possible_paths = self.get_possible_server_paths();
        tracing::info!("Checking {} possible server locations", possible_paths.len());

        for (index, path) in possible_paths.iter().enumerate() {
            tracing::debug!("[{}] Checking path: {:?}", index + 1, path);
            
            if path.exists() {
                if path.is_file() {
                    tracing::info!("✓ Found server binary at: {:?}", path);
                    
                    // Found server binary
                    let mut binary_path = self.binary_path.lock().unwrap();
                    *binary_path = Some(path.clone());

                    let mut status = self.status.lock().unwrap();
                    if *status == ServerStatus::NotInstalled {
                        *status = ServerStatus::Stopped;
                    }

                    return Ok(ServerInfo {
                        status: status.clone(),
                        installed: true,
                        binary_path: Some(path.to_string_lossy().to_string()),
                        ws_port: 8080,
                        udp_port: 9000,
                        pid: self.get_process_pid(),
                    });
                } else {
                    tracing::debug!("  ✗ Path exists but is not a file (directory?)");
                }
            } else {
                tracing::debug!("  ✗ Path does not exist");
            }
        }

        // Server not found
        tracing::warn!("Server binary not found in any of the checked locations");
        *self.status.lock().unwrap() = ServerStatus::NotInstalled;

        Ok(ServerInfo {
            status: ServerStatus::NotInstalled,
            installed: false,
            binary_path: None,
            ws_port: 8080,
            udp_port: 9000,
            pid: None,
        })
    }

    /// Get the list of possible server binary locations
    fn get_possible_server_paths(&self) -> Vec<PathBuf> {
        let mut paths = Vec::new();
        
        // Server executable name variations
        let server_names = vec![
            "voice-server.exe",
            "voice-server",
            "Nexum-Server.exe",
            "Nexum-Server",
            "nexum-server.exe",
            "nexum-server",
        ];

        // 1. Same directory as the client executable (HIGHEST PRIORITY)
        if let Ok(exe_path) = std::env::current_exe() {
            tracing::debug!("Current executable: {:?}", exe_path);
            if let Some(parent) = exe_path.parent() {
                tracing::debug!("Executable parent directory: {:?}", parent);
                for name in &server_names {
                    paths.push(parent.join(name));
                }
            }
        }

        // 2. Current working directory
        if let Ok(cwd) = std::env::current_dir() {
            tracing::debug!("Current working directory: {:?}", cwd);
            for name in &server_names {
                paths.push(cwd.join(name));
            }
        }

        // 3. Resources directory (for bundled apps)
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                for name in &server_names {
                    paths.push(parent.join("resources").join(name));
                }
            }
        }

        // 4. Standard installation paths
        #[cfg(target_os = "windows")]
        {
            for name in &server_names {
                paths.push(PathBuf::from(format!("C:\\Program Files\\Nexum\\{}", name)));
                paths.push(PathBuf::from(format!("C:\\Program Files (x86)\\Nexum\\{}", name)));
            }
        }

        // 5. User's home directory
        if let Some(home) = dirs::home_dir() {
            for name in &server_names {
                paths.push(home.join("nexum").join(name));
            }
        }

        // 6. Development paths (relative to client)
        paths.push(PathBuf::from("../server/target/release/voice-server.exe"));
        paths.push(PathBuf::from("../server/target/debug/voice-server.exe"));
        paths.push(PathBuf::from("../../server/target/release/voice-server.exe"));
        paths.push(PathBuf::from("../../server/target/debug/voice-server.exe"));

        paths
    }

    /// Start the local server with optional admin password
    pub fn start_server(&self, admin_password: Option<String>) -> Result<()> {
        let binary_path = self.binary_path.lock().unwrap();
        
        let path = binary_path
            .as_ref()
            .context("Server binary path not set. Call detect_server() first.")?;

        // Check if already running
        let process = self.process.lock().unwrap();
        if process.is_some() {
            anyhow::bail!("Server is already running");
        }
        drop(process);

        // Update status to starting
        *self.status.lock().unwrap() = ServerStatus::Starting;

        // Create server working directory in user's home
        // This ensures server.toml and data/ are created in the correct location
        let server_dir = dirs::home_dir()
            .context("Failed to get home directory")?
            .join(".nexum")
            .join("server");
        
        std::fs::create_dir_all(&server_dir)
            .context("Failed to create server directory")?;

        // Build command with proper working directory
        let mut cmd = Command::new(path);
        cmd.current_dir(&server_dir);  // CRITICAL: Server runs from its own directory
        cmd.arg("--non-interactive");
        
        // Data will be stored in ./data relative to server_dir
        // No need to specify --data-path, it will use default ./data

        // Add admin password if provided (for first-time setup)
        if let Some(password) = admin_password {
            cmd.arg("--admin-password");
            cmd.arg(password);
        }

        // Spawn the server process
        let child = cmd
            .spawn()
            .context("Failed to spawn server process")?;

        let pid = child.id();

        // Store the process handle
        let mut process = self.process.lock().unwrap();
        *process = Some(child);

        // Update status to running
        *self.status.lock().unwrap() = ServerStatus::Running;

        tracing::info!("Server started with PID: {}", pid);
        Ok(())
    }

    /// Stop the local server
    pub fn stop_server(&self) -> Result<()> {
        let mut process = self.process.lock().unwrap();

        match process.take() {
            Some(mut child) => {
                // Try graceful shutdown first
                #[cfg(target_os = "windows")]
                {
                    // On Windows, we just kill it
                    child.kill().context("Failed to kill server process")?;
                }

                #[cfg(not(target_os = "windows"))]
                {
                    // On Unix, try SIGTERM first
                    use std::os::unix::process::CommandExt;
                    let _ = child.kill();
                }

                // Wait for process to exit
                let _ = child.wait();

                *self.status.lock().unwrap() = ServerStatus::Stopped;
                tracing::info!("Server stopped");
                Ok(())
            }
            None => {
                anyhow::bail!("Server is not running")
            }
        }
    }

    /// Get the current server status
    pub fn get_status(&self) -> ServerInfo {
        let status = self.status.lock().unwrap().clone();
        let binary_path = self.binary_path.lock().unwrap();

        ServerInfo {
            status,
            installed: binary_path.is_some(),
            binary_path: binary_path.as_ref().map(|p| p.to_string_lossy().to_string()),
            ws_port: 8080,
            udp_port: 9000,
            pid: self.get_process_pid(),
        }
    }

    /// Set a manual server path (for user configuration)
    pub fn set_configured_path(&self, path: PathBuf) -> Result<()> {
        tracing::info!("Setting configured server path: {:?}", path);
        
        if !path.exists() {
            anyhow::bail!("Server executable not found at specified path");
        }
        
        if !path.is_file() {
            anyhow::bail!("Specified path is not a file");
        }
        
        // Validate it's an executable (basic check)
        #[cfg(target_os = "windows")]
        {
            let filename = path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");
            if !filename.ends_with(".exe") {
                anyhow::bail!("File must be an executable (.exe)");
            }
        }
        
        *self.configured_path.lock().unwrap() = Some(path.clone());
        *self.binary_path.lock().unwrap() = Some(path);
        *self.status.lock().unwrap() = ServerStatus::Stopped;
        
        tracing::info!("Configured path set successfully");
        Ok(())
    }
    
    /// Get the configured server path (manual configuration)
    pub fn get_configured_path(&self) -> Option<PathBuf> {
        self.configured_path.lock().unwrap().clone()
    }
    
    /// Clear the configured server path (reset to auto-detect)
    pub fn clear_configured_path(&self) {
        tracing::info!("Clearing configured server path");
        *self.configured_path.lock().unwrap() = None;
        *self.binary_path.lock().unwrap() = None;
        *self.status.lock().unwrap() = ServerStatus::NotInstalled;
    }

    /// Check if the server process is still alive
    pub fn check_process_health(&self) -> bool {
        let mut process = self.process.lock().unwrap();

        if let Some(child) = process.as_mut() {
            // Try to check if process is still running
            match child.try_wait() {
                Ok(Some(_status)) => {
                    // Process has exited
                    *process = None;
                    *self.status.lock().unwrap() = ServerStatus::Stopped;
                    false
                }
                Ok(None) => {
                    // Process is still running
                    true
                }
                Err(_e) => {
                    // Error checking status, assume it's dead
                    *process = None;
                    *self.status.lock().unwrap() = ServerStatus::Error;
                    false
                }
            }
        } else {
            false
        }
    }

    /// Get the PID of the server process if running
    fn get_process_pid(&self) -> Option<u32> {
        let process = self.process.lock().unwrap();
        process.as_ref().map(|child| child.id())
    }

    /// Returns the canonical working directory where the server stores its data
    /// when launched from the client: ~/.nexum/server/
    pub fn get_server_data_dir() -> Option<std::path::PathBuf> {
        dirs::home_dir().map(|h| h.join(".nexum").join("server"))
    }

    /// Reset admin password: stop server if running, delete server.toml so the
    /// next launch triggers the first-launch setup flow with a new password.
    pub fn reset_admin_password(&self) -> Result<()> {
        // Stop server if it's running
        {
            let process = self.process.lock().unwrap();
            if process.is_some() {
                drop(process);
                self.stop_server()?;
            }
        }

        let server_dir = Self::get_server_data_dir()
            .context("Failed to get home directory")?;
        let config_path = server_dir.join("server.toml");

        if config_path.exists() {
            std::fs::remove_file(&config_path)
                .context("Failed to delete server.toml")?;
        }

        Ok(())
    }

    /// Delete server data: stop server if running, wipe the data/ directory
    /// (database). Keeps server.toml (config) intact.
    pub fn delete_server_data(&self) -> Result<()> {
        // Stop server if it's running
        {
            let process = self.process.lock().unwrap();
            if process.is_some() {
                drop(process);
                self.stop_server()?;
            }
        }

        let server_dir = Self::get_server_data_dir()
            .context("Failed to get home directory")?;
        let data_dir = server_dir.join("data");

        if data_dir.exists() {
            std::fs::remove_dir_all(&data_dir)
                .context("Failed to delete server data directory")?;
        }

        Ok(())
    }

    /// Check if server.toml exists in the server's working directory.
    /// The server always runs from ~/.nexum/server/ when launched from the client,
    /// so server.toml and data/ are created there.
    pub fn is_server_configured(&self) -> bool {
        // Primary check: canonical server data directory (~/.nexum/server/server.toml)
        if let Some(server_dir) = Self::get_server_data_dir() {
            if server_dir.join("server.toml").exists() {
                return true;
            }
        }

        // Fallback: next to the server binary (manual / standalone launch)
        let binary_path = self.binary_path.lock().unwrap();
        if let Some(path) = binary_path.as_ref() {
            if let Some(parent) = path.parent() {
                if parent.join("server.toml").exists() {
                    return true;
                }
            }
        }

        false
    }
}

impl Default for ServerManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_server_manager_creation() {
        let manager = ServerManager::new();
        let status = manager.get_status();
        assert_eq!(status.status, ServerStatus::NotInstalled);
        assert!(!status.installed);
    }

    #[test]
    fn test_detect_server_paths() {
        let manager = ServerManager::new();
        let paths = manager.get_possible_server_paths();
        assert!(!paths.is_empty());
    }

    #[test]
    fn test_is_server_configured() {
        let manager = ServerManager::new();
        // Should not crash even without server installed
        let _configured = manager.is_server_configured();
    }
}
