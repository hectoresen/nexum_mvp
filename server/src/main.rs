use anyhow::Result;
use tracing::{info, error};
use tracing_subscriber;
use clap::Parser;

mod config;
mod db;
mod models;
mod websocket;
mod udp;
mod handlers;
mod session;
mod avatar;

use config::Config;
use db::Database;
use session::SessionManager;

#[derive(Parser, Debug)]
#[command(name = "voice-server")]
#[command(about = "Self-hosted voice and chat server", long_about = None)]
struct Args {
    /// Run in non-interactive mode (for GUI launcher)
    #[arg(long)]
    non_interactive: bool,
    
    /// Set admin password directly (skips interactive prompt)
    #[arg(long)]
    admin_password: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Parse command line arguments
    let args = Args::parse();
    
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"))
        )
        .init();

    info!("🚀 Voice Server starting...");

    // Load configuration
    let config = Config::load(args.non_interactive, args.admin_password)?;
    info!("📋 Configuration loaded");
    info!("   WebSocket: {}:{}", config.server.host, config.server.ws_port);
    info!("   UDP: {}:{}", config.server.host, config.server.udp_port);
    info!("   Max users: {}", config.limits.max_users);

    // Initialize database
    let db = Database::new(&config.server.data_path)?;
    db.init()?;
    info!("💾 Database initialized");

    // Create session manager
    let session_manager = SessionManager::new();
    info!("🔐 Session manager ready");

    // Spawn UDP server
    let udp_handle = tokio::spawn(udp::run_udp_server(
        config.clone(),
        session_manager.clone(),
    ));
    info!("🎤 UDP voice server listening on port {}", config.server.udp_port);

    // Start WebSocket server
    let ws_result = websocket::run_ws_server(
        config.clone(),
        db,
        session_manager.clone(),
    ).await;

    // Wait for UDP server to finish (it shouldn't unless there's an error)
    if let Err(e) = ws_result {
        error!("WebSocket server error: {}", e);
    }

    udp_handle.abort();
    
    info!("👋 Server shutdown complete");
    Ok(())
}
