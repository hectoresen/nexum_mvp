// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod server_manager;

use server_manager::{ServerManager, ServerInfo};
use tauri::State;
use std::sync::Mutex;

/// Application state containing the server manager
struct AppState {
    server_manager: Mutex<ServerManager>,
}

/// Detect if the local server is installed and get its status
#[tauri::command]
fn detect_local_server(state: State<AppState>) -> Result<ServerInfo, String> {
    let manager = state.server_manager.lock().unwrap();
    manager.detect_server().map_err(|e| e.to_string())
}

/// Get the current status of the local server
#[tauri::command]
fn get_server_status(state: State<AppState>) -> ServerInfo {
    let manager = state.server_manager.lock().unwrap();
    manager.get_status()
}

/// Start the local server with optional admin password
#[tauri::command]
fn start_local_server(
    state: State<AppState>,
    admin_password: Option<String>,
) -> Result<(), String> {
    let manager = state.server_manager.lock().unwrap();
    manager.start_server(admin_password).map_err(|e| e.to_string())
}

/// Stop the local server
#[tauri::command]
fn stop_local_server(state: State<AppState>) -> Result<(), String> {
    let manager = state.server_manager.lock().unwrap();
    manager.stop_server().map_err(|e| e.to_string())
}

/// Check if the server process is still healthy
#[tauri::command]
fn check_server_health(state: State<AppState>) -> bool {
    let manager = state.server_manager.lock().unwrap();
    manager.check_process_health()
}

/// Check if the server is already configured (server.toml exists)
#[tauri::command]
fn is_server_configured(state: State<AppState>) -> bool {
    let manager = state.server_manager.lock().unwrap();
    manager.is_server_configured()
}

fn main() {
    // Initialize the server manager
    let server_manager = ServerManager::new();
    
    let app_state = AppState {
        server_manager: Mutex::new(server_manager),
    };

    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            detect_local_server,
            get_server_status,
            start_local_server,
            stop_local_server,
            check_server_health,
            is_server_configured,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
