use anyhow::Result;
use axum::{
    extract::{ws::WebSocket, WebSocketUpgrade, State},
    response::Response,
    routing::get,
    Router,
};
use tokio::sync::mpsc;
use tracing::{info, warn, error};
use std::sync::Arc;

use crate::config::Config;
use crate::db::Database;
use crate::session::SessionManager;
use crate::handlers;

pub struct AppState {
    pub config: Config,
    pub db: Database,
    pub session_manager: SessionManager,
}

pub async fn run_ws_server(
    config: Config,
    db: Database,
    session_manager: SessionManager,
) -> Result<()> {
    let state = Arc::new(AppState {
        config: config.clone(),
        db,
        session_manager,
    });

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(state);

    let addr = format!("{}:{}", config.server.host, config.server.ws_port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    
    info!("🌐 WebSocket server listening on {}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (sender, mut receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel();

    // Spawn task to forward messages from tx to the WebSocket sender
    let mut send_task = tokio::spawn(async move {
        use axum::extract::ws::Message;
        use futures_util::SinkExt;
        
        let mut sender = sender;
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
        use axum::extract::ws::Message;
        use futures_util::StreamExt;
        
        let mut session_id = None;

        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    match handlers::handle_message(&text, session_id, &state_clone, &tx_clone).await {
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
