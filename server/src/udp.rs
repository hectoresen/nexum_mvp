use anyhow::Result;
use tokio::net::UdpSocket;
use tracing::{info, error, warn};
use uuid::Uuid;

use crate::config::Config;
use crate::session::SessionManager;

const MAX_UDP_PACKET_SIZE: usize = 1472; // MTU-safe size

pub async fn run_udp_server(
    config: Config,
    session_manager: SessionManager,
) -> Result<()> {
    let addr = format!("{}:{}", config.server.host, config.server.udp_port);
    let socket = UdpSocket::bind(&addr).await?;
    
    info!("🎤 UDP voice server bound to {}", addr);

    let mut buf = vec![0u8; MAX_UDP_PACKET_SIZE];

    loop {
        match socket.recv_from(&mut buf).await {
            Ok((len, src_addr)) => {
                if len < 17 {
                    warn!("Received packet too small from {}: {} bytes", src_addr, len);
                    continue;
                }

                // Parse packet: [version:1][sessionId:16][opus_data:variable]
                let version = buf[0];
                if version != 1 {
                    warn!("Unsupported UDP protocol version {} from {}", version, src_addr);
                    continue;
                }

                // Extract session ID
                let session_id_bytes: [u8; 16] = buf[1..17].try_into().unwrap();
                let session_id = Uuid::from_bytes(session_id_bytes);

                // Verify session exists
                let user_id = match session_manager.get_session_by_id(session_id) {
                    Some(uid) => uid,
                    None => {
                        warn!("Unknown session {} from {}", session_id, src_addr);
                        continue;
                    }
                };

                // Get user's voice channel
                let channel_id = match session_manager.get_user_voice_channel(user_id) {
                    Some(cid) => cid,
                    None => {
                        // User not in a voice channel, drop packet silently
                        continue;
                    }
                };

                // Get all members in the voice channel except sender
                let members = session_manager.get_voice_channel_members(channel_id);
                
                // Forward packet to all other members
                // Note: In production, we'd need to track UDP addresses per session
                // For MVP, this is a simplified forwarding mechanism
                // Clients would need to register their UDP address with session
                
                // TODO: Implement proper UDP address tracking per session
                // For now, we just verify the logic without actual forwarding
                
                if members.len() > 1 {
                    // In a real implementation:
                    // for member_id in members {
                    //     if member_id != user_id {
                    //         if let Some(addr) = get_udp_address(member_id) {
                    //             socket.send_to(&buf[..len], addr).await?;
                    //         }
                    //     }
                    // }
                }
            }
            Err(e) => {
                error!("UDP recv_from error: {}", e);
            }
        }
    }
}
