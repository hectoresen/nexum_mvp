// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct LocalServerStatus {
    installed: bool,
    running: bool,
    binary_path: Option<String>,
    port: Option<u16>,
}

/// Check if the server binary is installed
#[tauri::command]
fn check_server_installed() -> LocalServerStatus {
    // Check common locations for the server binary
    let mut possible_paths = vec![
        // Same directory as client
        PathBuf::from("./voice-server.exe"),
        PathBuf::from("./voice-server"),
        // Program Files
        PathBuf::from("C:/Program Files/Voice MVP/voice-server.exe"),
    ];

    // Add user directory path if available
    if let Some(home) = dirs::home_dir() {
        possible_paths.push(home.join("voice-mvp/voice-server.exe"));
    }

    for path in possible_paths {
        if path.exists() {
            return LocalServerStatus {
                installed: true,
                running: false, // TODO: Check if actually running
                binary_path: Some(path.to_string_lossy().to_string()),
                port: Some(8080), // Default port
            };
        }
    }

    LocalServerStatus {
        installed: false,
        running: false,
        binary_path: None,
        port: None,
    }
}

/// Launch the local server
#[tauri::command]
fn launch_local_server(binary_path: String) -> Result<String, String> {
    // Spawn the server process
    match Command::new(&binary_path)
        .spawn()
    {
        Ok(child) => Ok(format!("Server launched with PID: {}", child.id())),
        Err(e) => Err(format!("Failed to launch server: {}", e)),
    }
}

/// Open the server download page in default browser
#[tauri::command]
fn open_server_download_page() -> Result<(), String> {
    let url = "https://github.com/voice-mvp/releases"; // TODO: Update with actual URL
    if let Err(e) = open::that(url) {
        return Err(format!("Failed to open browser: {}", e));
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            check_server_installed,
            launch_local_server,
            open_server_download_page
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
