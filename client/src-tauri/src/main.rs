// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod server_manager;

use server_manager::{ServerManager, ServerInfo};
use tauri::{Manager, State};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
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

#[derive(serde::Serialize)]
struct ServerConfigSnapshot {
    name: String,
    max_users: u32,
    max_users_per_voice_channel: u32,
    max_message_size: u32,
    is_private: bool,
}

/// Read the current server.toml and return user-visible config fields.
/// Used by the pre-launch modal to pre-fill the form when the server is already configured.
#[tauri::command]
fn read_server_config() -> Result<ServerConfigSnapshot, String> {
    let server_dir = crate::server_manager::ServerManager::get_server_data_dir()
        .ok_or("Could not determine server data directory")?;
    let config_path = server_dir.join("server.toml");
    if !config_path.exists() {
        return Err("Server is not configured yet.".to_string());
    }
    let content = std::fs::read_to_string(&config_path).map_err(|e| e.to_string())?;

    let mut name = String::from("My Nexum Server");
    let mut max_users: u32 = 200;
    let mut max_users_per_voice_channel: u32 = 100;
    let mut max_message_size: u32 = 2000;
    let mut is_private = false;

    for line in content.lines() {
        let trimmed = line.trim_start();
        if let Some(rest) = trimmed.strip_prefix("name = ") {
            name = rest.trim().trim_matches('"').to_string();
        } else if let Some(rest) = trimmed.strip_prefix("max_users = ") {
            if let Ok(v) = rest.trim().parse::<u32>() { max_users = v; }
        } else if let Some(rest) = trimmed.strip_prefix("max_users_per_voice_channel = ") {
            if let Ok(v) = rest.trim().parse::<u32>() { max_users_per_voice_channel = v; }
        } else if let Some(rest) = trimmed.strip_prefix("max_message_size = ") {
            if let Ok(v) = rest.trim().parse::<u32>() { max_message_size = v; }
        } else if trimmed.starts_with("join_password = ") {
            let val = trimmed["join_password = ".len()..].trim().trim_matches('"');
            if !val.is_empty() { is_private = true; }
        }
    }

    Ok(ServerConfigSnapshot {
        name,
        max_users,
        max_users_per_voice_channel,
        max_message_size,
        is_private,
    })
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

/// Get (or create on first run) the device's ed25519 public key.
/// The private key is stored in `~/.nexum/device.key` as a 64-char hex string.
/// The returned value is the 32-byte public key encoded as 64 hex chars.
/// This key is the stable "Device ID" — no hardware data is ever read or transmitted.
#[tauri::command]
fn get_device_public_key() -> Result<String, String> {
    let key_dir = dirs::home_dir()
        .ok_or_else(|| "Could not find home directory".to_string())?;
    let nexum_dir = key_dir.join(".nexum");
    std::fs::create_dir_all(&nexum_dir).map_err(|e| e.to_string())?;
    let key_path = nexum_dir.join("device.key");

    let secret_bytes: [u8; 32] = if key_path.exists() {
        let hex_str = std::fs::read_to_string(&key_path).map_err(|e| e.to_string())?;
        let bytes = hex::decode(hex_str.trim()).map_err(|e| format!("Corrupt device key: {}", e))?;
        bytes.try_into().map_err(|_| "Device key has wrong length".to_string())?
    } else {
        use rand::RngCore;
        let mut secret = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut secret);
        std::fs::write(&key_path, hex::encode(&secret)).map_err(|e| e.to_string())?;
        secret
    };

    let signing_key = ed25519_dalek::SigningKey::from_bytes(&secret_bytes);
    let public_key = signing_key.verifying_key();
    Ok(hex::encode(public_key.as_bytes()))
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

/// Build and register the system tray icon with its context menu.
///
/// Tray behaviour:
/// - Left-click → show and focus the main window.
/// - Right-click → context menu appears automatically (Tauri default).
/// - "Nexum" header  → disabled label (informational only).
/// - "Check for updates" → no-op placeholder for future auto-update feature.
/// - "Quit Nexum" → forcefully exits the process.
fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let header = MenuItem::with_id(app, "header", "Nexum", false, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let check_updates = MenuItem::with_id(app, "check_updates", "Check for updates", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Nexum", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&header, &sep1, &check_updates, &sep2, &quit])?;

    let mut builder = TrayIconBuilder::with_id("main")
        .menu(&menu)
        .tooltip("Nexum")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            "check_updates" => {
                // Placeholder — auto-update not yet implemented.
                tracing::debug!("Check for updates requested (not yet implemented)");
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // Left-click on the tray icon → restore the window.
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        });

    // Use the bundled app icon for the tray; fall back gracefully if unavailable.
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;
    Ok(())
}

/// Update the tray tooltip to reflect the current total unread count.
/// Called from the frontend whenever unreadChannelIds or unreadDmUserIds change.
#[tauri::command]
fn update_unread_count(count: u32, app_handle: tauri::AppHandle) {
    if let Some(tray) = app_handle.tray_by_id("main") {
        let tooltip = if count > 0 {
            format!("Nexum ({count} unread)")
        } else {
            "Nexum".to_string()
        };
        let _ = tray.set_tooltip(Some(&tooltip));
    }
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
        .setup(|app| {
            setup_tray(app)?;
            Ok(())
        })
        // Intercept window close: hide to tray instead of exiting.
        // The only way to fully quit is via "Quit Nexum" in the tray menu.
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
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
            read_server_config,
            get_device_public_key,
            update_unread_count,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
