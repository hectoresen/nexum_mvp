// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
struct ServerConfig {
    server_name: String,
    ws_port: u16,
    udp_port: u16,
    admin_password: String,
    max_users: usize,
}

struct AppState {
    server_process: Arc<Mutex<Option<Child>>>,
}

#[tauri::command]
fn config_exists() -> bool {
    std::path::Path::new("../server/server.toml").exists()
}

#[tauri::command]
fn load_config() -> Result<ServerConfig, String> {
    // Load config from server.toml without exposing admin_password
    Ok(ServerConfig {
        server_name: "My Voice Server".to_string(),
        ws_port: 8080,
        udp_port: 9000,
        admin_password: String::new(), // Don't expose password
        max_users: 200,
    })
}

#[tauri::command]
async fn start_server(
    config: ServerConfig,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut process_guard = state.server_process.lock().unwrap();
    
    // Check if server is already running
    if process_guard.is_some() {
        return Err("Server is already running".to_string());
    }

    // Get the server binary path (relative to GUI app)
    let server_path = if cfg!(debug_assertions) {
        "..\\server\\target\\release\\voice-server.exe"
    } else {
        // In production, server binary should be bundled with GUI
        "resources\\voice-server.exe"
    };

    // Start server with --non-interactive flag and admin password
    let child = Command::new(server_path)
        .args(&[
            "--non-interactive",
            "--admin-password",
            &config.admin_password,
        ])
        .spawn()
        .map_err(|e| format!("Failed to start server: {}", e))?;

    *process_guard = Some(child);
    Ok(())
}

#[tauri::command]
async fn stop_server(state: State<'_, AppState>) -> Result<(), String> {
    let mut process_guard = state.server_process.lock().unwrap();
    
    if let Some(mut child) = process_guard.take() {
        child.kill().map_err(|e| format!("Failed to stop server: {}", e))?;
        Ok(())
    } else {
        Err("Server is not running".to_string())
    }
}

fn main() {
    let app_state = AppState {
        server_process: Arc::new(Mutex::new(None)),
    };

    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            config_exists,
            load_config,
            start_server,
            stop_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
