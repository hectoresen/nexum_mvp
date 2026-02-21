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
}

impl ServerManager {
    pub fn new() -> Self {
        Self {
            process: Arc::new(Mutex::new(None)),
            status: Arc::new(Mutex::new(ServerStatus::NotInstalled)),
            binary_path: Arc::new(Mutex::new(None)),
        }
    }

    /// Detect if the server binary exists and where it is located
    pub fn detect_server(&self) -> Result<ServerInfo> {
        let possible_paths = self.get_possible_server_paths();

        for path in possible_paths {
            if path.exists() && path.is_file() {
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
            }
        }

        // Server not found
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

        // 1. Same directory as the client executable
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                paths.push(parent.join("voice-server.exe"));
                paths.push(parent.join("voice-server"));
            }
        }

        // 2. Resources directory (for bundled apps)
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                paths.push(parent.join("resources").join("voice-server.exe"));
                paths.push(parent.join("resources").join("voice-server"));
            }
        }

        // 3. Standard installation paths
        #[cfg(target_os = "windows")]
        {
            paths.push(PathBuf::from("C:\\Program Files\\Voice MVP\\voice-server.exe"));
            paths.push(PathBuf::from("C:\\Program Files (x86)\\Voice MVP\\voice-server.exe"));
        }

        // 4. User's home directory
        if let Some(home) = dirs::home_dir() {
            paths.push(home.join("voice-mvp").join("voice-server.exe"));
            paths.push(home.join("voice-mvp").join("voice-server"));
        }

        // 5. Current working directory (for development)
        paths.push(PathBuf::from("voice-server.exe"));
        paths.push(PathBuf::from("voice-server"));
        paths.push(PathBuf::from("../server/target/release/voice-server.exe"));
        paths.push(PathBuf::from("../server/target/debug/voice-server.exe"));

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

        // Build command
        let mut cmd = Command::new(path);
        cmd.arg("--non-interactive");

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

    /// Check if server.toml exists (indicates server is configured)
    pub fn is_server_configured(&self) -> bool {
        let binary_path = self.binary_path.lock().unwrap();
        
        if let Some(path) = binary_path.as_ref() {
            if let Some(parent) = path.parent() {
                let config_path = parent.join("server.toml");
                return config_path.exists();
            }
        }

        // Also check relative to executable
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                let config_path = parent.join("server.toml");
                if config_path.exists() {
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
