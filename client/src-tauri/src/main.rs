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

/// Set a manual server path (user configuration)
#[tauri::command]
fn set_server_path(state: State<AppState>, path: String) -> Result<(), String> {
    let manager = state.server_manager.lock().unwrap();
    let path_buf = std::path::PathBuf::from(path);
    manager.set_configured_path(path_buf).map_err(|e| e.to_string())
}

/// Get the configured server path (manual configuration)
#[tauri::command]
fn get_configured_server_path(state: State<AppState>) -> Option<String> {
    let manager = state.server_manager.lock().unwrap();
    manager.get_configured_path().map(|p| p.to_string_lossy().to_string())
}

/// Clear the configured server path (reset to auto-detect)
#[tauri::command]
fn clear_configured_server_path(state: State<AppState>) {
    let manager = state.server_manager.lock().unwrap();
    manager.clear_configured_path();
}

/// Reset admin password: stops server and deletes server.toml so the next
/// launch triggers the first-launch setup flow.
#[tauri::command]
fn reset_admin_password(state: State<AppState>) -> Result<(), String> {
    let manager = state.server_manager.lock().unwrap();
    manager.reset_admin_password().map_err(|e| e.to_string())
}

/// Delete server data directory (wipes the database). Keeps server.toml.
#[tauri::command]
fn delete_server_data(state: State<AppState>) -> Result<(), String> {
    let manager = state.server_manager.lock().unwrap();
    manager.delete_server_data().map_err(|e| e.to_string())
}

/// Write an initial server.toml to ~/.nexum/server/ before first launch.
/// Called from the pre-launch config modal to persist user-chosen name and limits.
#[tauri::command]
fn write_initial_server_config(
    name: String,
    max_users: u32,
    max_voice: u32,
    max_message: u32,
    admin_password: String,
    join_password: String,
) -> Result<(), String> {
    let server_dir = crate::server_manager::ServerManager::get_server_data_dir()
        .ok_or("Could not determine server data directory")?;
    std::fs::create_dir_all(&server_dir).map_err(|e| e.to_string())?;
    let config_path = server_dir.join("server.toml");
    // Escape double-quotes in user-provided strings
    let safe_name = name.replace('"', "\\\"");
    let safe_pwd = admin_password.replace('"', "\\\"");
    let mut content = format!(
        "[server]\nname = \"{safe_name}\"\nhost = \"0.0.0.0\"\nws_port = 8080\nudp_port = 9000\ndata_path = \"./data\"\nsession_timeout_secs = 60\nping_interval_secs = 30\nadmin_password = \"{safe_pwd}\"\n"
    );
    if !join_password.is_empty() {
        let safe_jp = join_password.replace('"', "\\\"");
        content.push_str(&format!("join_password = \"{safe_jp}\"\n"));
    }
    content.push_str(&format!(
        "\n[limits]\nmax_users = {max_users}\nmax_users_per_voice_channel = {max_voice}\nmax_message_size = {max_message}\nrate_limit_messages_per_minute = 60\n\n[persistence]\nenabled = true\n"
    ));
    std::fs::write(&config_path, content).map_err(|e| e.to_string())
}

/// Update just the admin_password field in an existing server.toml, without
/// overwriting any other settings. Called from the pre-launch Security tab.
#[tauri::command]
fn update_server_admin_password(
    new_password: String,
    state: State<AppState>,
) -> Result<(), String> {
    // Refuse if server is currently running
    let health = {
        let manager = state.server_manager.lock().unwrap();
        manager.check_process_health()
    };
    if health {
        return Err("Cannot change admin password while the server is running. Stop it first.".to_string());
    }

    let server_dir = crate::server_manager::ServerManager::get_server_data_dir()
        .ok_or("Could not determine server data directory")?;
    let config_path = server_dir.join("server.toml");

    if !config_path.exists() {
        return Err("Server is not configured yet. Use Launch Server to configure it first.".to_string());
    }

    let content = std::fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let safe_pwd = new_password.replace('"', "\\\"");
    let new_content: String = content
        .lines()
        .map(|line| {
            if line.trim_start().starts_with("admin_password") {
                format!("admin_password = \"{safe_pwd}\"")
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\n");
    // Preserve trailing newline if original had one
    let new_content = if content.ends_with('\n') {
        new_content + "\n"
    } else {
        new_content
    };
    std::fs::write(&config_path, new_content).map_err(|e| e.to_string())
}

/// Check if the server is accepting TCP connections on a given port.
/// Used to confirm the server is ready after `start_local_server`.
#[tauri::command]
fn check_server_ready(port: u16) -> bool {
    std::net::TcpStream::connect_timeout(
        &std::net::SocketAddr::from(([127, 0, 0, 1], port)),
        std::time::Duration::from_millis(500),
    )
    .is_ok()
}

/// Check if Nexum is registered in Windows startup (HKCU Run key)
#[tauri::command]
fn is_auto_start_enabled(app_handle: tauri::AppHandle) -> bool {
    #[cfg(windows)]
    {
        use winreg::RegKey;
        use winreg::enums::*;
        let app_name = app_handle.package_info().name.clone();
        if let Ok(hkcu) = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")
        {
            return hkcu.get_value::<String, _>(&app_name).is_ok();
        }
        false
    }
    #[cfg(not(windows))]
    false
}

/// Register Nexum to launch at Windows startup
#[tauri::command]
fn enable_auto_start(app_handle: tauri::AppHandle) -> Result<(), String> {
    #[cfg(windows)]
    {
        use winreg::RegKey;
        use winreg::enums::*;
        let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
        let app_name = app_handle.package_info().name.clone();
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let run_key = hkcu
            .open_subkey_with_flags(
                "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                KEY_SET_VALUE,
            )
            .map_err(|e| e.to_string())?;
        run_key
            .set_value(&app_name, &exe_path.to_string_lossy().to_string())
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    #[cfg(not(windows))]
    Err("Auto-start is only supported on Windows".into())
}

/// Remove Nexum from Windows startup
#[tauri::command]
fn disable_auto_start(app_handle: tauri::AppHandle) -> Result<(), String> {
    #[cfg(windows)]
    {
        use winreg::RegKey;
        use winreg::enums::*;
        let app_name = app_handle.package_info().name.clone();
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let run_key = hkcu
            .open_subkey_with_flags(
                "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                KEY_SET_VALUE,
            )
            .map_err(|e| e.to_string())?;
        // delete_value returns an error if the key doesn't exist — ignore it
        let _ = run_key.delete_value(&app_name);
        return Ok(());
    }
    #[cfg(not(windows))]
    Err("Auto-start is only supported on Windows".into())
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
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            detect_local_server,
            get_server_status,
            start_local_server,
            stop_local_server,
            check_server_health,
            is_server_configured,
            set_server_path,
            get_configured_server_path,
            clear_configured_server_path,
            reset_admin_password,
            delete_server_data,
            is_auto_start_enabled,
            enable_auto_start,
            disable_auto_start,
            write_initial_server_config,
            check_server_ready,
            update_server_admin_password,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
