use anyhow::Result;
use axum::{
    extract::{ws::WebSocket, WebSocketUpgrade, State, ConnectInfo},
    response::Response,
    routing::{get, post},
    Router,
};
use tower_http::{
    cors::{CorsLayer, Any},
    services::ServeDir,
};
use tokio::sync::mpsc;
use tracing::{info, error};
use std::sync::Arc;
use std::net::SocketAddr;
use futures_util::{SinkExt, StreamExt};

use std::sync::RwLock;
use crate::config::Config;
use crate::db::Database;
use crate::session::SessionManager;
use crate::handlers;
use crate::avatar;

pub struct AppState {
    pub config: RwLock<Config>,
    pub config_path: String,
    pub db: Database,
    pub session_manager: SessionManager,
}

pub async fn run_ws_server(
    config: Config,
    db: Database,
    session_manager: SessionManager,
) -> Result<()> {
    let config_path = std::env::var("CONFIG_PATH")
        .unwrap_or_else(|_| "server.toml".to_string());

    let state = Arc::new(AppState {
        config: RwLock::new(config.clone()),
        config_path,
        db,
        session_manager,
    });

    // Configure CORS to allow WebSocket connections from web browsers
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Create avatars directory if it doesn't exist
    tokio::fs::create_dir_all("data/avatars").await.ok();

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/api/upload-avatar", post(avatar::upload_avatar_handler))
        .route("/api/users/:user_id/avatar", post(avatar::upload_avatar_handler))
        .route("/api/users/:user_id/avatar", get(avatar::download_avatar_handler))
        .nest_service("/avatars", ServeDir::new("data/avatars"))
        .layer(cors)
        .with_state(state);

    let addr = format!("{}:{}", config.server.host, config.server.ws_port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    
    info!("🌐 WebSocket server listening on {}", addr);
    info!("📁 Serving avatars from /avatars and /api/users/:user_id/avatar");
    info!("📤 Avatar upload endpoint: POST /api/users/:user_id/avatar");

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>()
    ).await?;

    Ok(())
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
) -> Response {
    let client_ip = addr.ip().to_string();
    ws.on_upgrade(move |socket| handle_socket(socket, state, client_ip))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>, client_ip: String) {
    use axum::extract::ws::Message;
    
    info!("Client connected from IP: {}", client_ip);
    
    let (mut sender, mut receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel();

    // Spawn task to forward messages from tx to the WebSocket sender
    let mut send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Handle incoming messages
    let state_clone = state.clone();
    let tx_clone = tx.clone();
    
    let mut recv_task = tokio::spawn(async move {
        let mut session_id = None;

        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    match handlers::handle_message(&text, session_id, &state_clone, &tx_clone, Some(&client_ip)).await {
                        Ok(new_session_id) => {
                            if session_id.is_none() {
                                session_id = Some(new_session_id);
                            }
                        }
                        Err(e) => {
                            error!("Error handling message: {}", e);
                        }
                    }
                }
                Message::Close(_) => {
                    if let Some(sid) = session_id {
                        state_clone.session_manager.remove_session(sid);
                        info!("Client disconnected, session cleaned up");
                    }
                    break;
                }
                Message::Ping(data) => {
                    if tx_clone.send(Message::Pong(data)).is_err() {
                        break;
                    }
                }
                _ => {}
            }
        }

        // Cleanup on disconnect
        if let Some(sid) = session_id {
            state_clone.session_manager.remove_session(sid);
        }
    });

    // Wait for either task to finish
    tokio::select! {
        _ = &mut send_task => {
            recv_task.abort();
        }
        _ = &mut recv_task => {
            send_task.abort();
        }
    }
}
