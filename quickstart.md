# Voice MVP - Quick Start Guide

## Project Structure

```
voice_mvp/
├── server/          # Rust WebSocket + UDP server
├── client/          # Tauri desktop app (React + TypeScript)
├── agent_decisions.md
├── todo.md
└── changelog.md
```

## Prerequisites

- **Rust** 1.75+ (install from https://rustup.rs)
- **Node.js** 20+ LTS (install from https://nodejs.org)
- **Tauri CLI** (will be installed via npm)

## Running the Server

```bash
# Navigate to server directory
cd server

# Build and run (debug mode)
cargo run

# The server will start on:
# - WebSocket: ws://0.0.0.0:8080/ws
# - UDP: 0.0.0.0:9000

# Build release version
cargo build --release
# Binary will be at: target/release/voice-server
```

### Server Configuration

On first run, a `server.example.toml` file will be created. Copy it to `server.toml` and customize:

```toml
[server]
host = "0.0.0.0"
ws_port = 8080
udp_port = 9000
data_path = "./data"

[limits]
max_users = 200
max_users_per_voice_channel = 100
max_message_size = 2000
```

## Running the Client

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# This will:
# 1. Start Vite dev server (React)
# 2. Launch Tauri app window
```

### Build Client for Production

```bash
# Build for your platform
npm run tauri build

# Output will be in:
# - Windows: src-tauri/target/release/bundle/
# - macOS: src-tauri/target/release/bundle/
```

## Testing the Full Stack

1. **Start the server** (in one terminal):
   ```bash
   cd server
   cargo run
   ```

2. **Start the client** (in another terminal):
   ```bash
   cd client
   npm run tauri dev
   ```

3. **Connect from the client**:
   - Username: any name you want
   - Server Address: `localhost:8080`
   - Click "Connect"

4. **Create a channel** (first user becomes owner):
   - Click the + button next to "Channels"
   - Enter channel name
   - Select "Text" or "Voice"
   - Click "Create"

5. **Send messages**:
   - Click on a text channel
   - Type a message
   - Press Send or Enter

## Current Status

### ✅ Working
- Server WebSocket connection
- User authentication (no password, just username)
- Channel creation/deletion (owner only)
- Text messaging
- Multi-user support
- Session management
- Database persistence (SQLite)

### ⚠️ Not Yet Implemented
- Voice chat audio capture/playback
- UDP voice packet forwarding (structure exists, needs UDP address tracking)
- Multiple clients testing
- Server spawn from client
- Production builds

### 🐛 Known Issues
- UDP voice forwarding incomplete (no UDP address registration)
- No message history pagination (loads all messages)
- No user-friendly error details in some cases
- Voice channel join button shows but does nothing

## Development Notes

- Default server logs to console at INFO level
- Set `RUST_LOG=debug` for verbose logging
- Client hot-reloads on code changes (Vite HMR)
- Server requires restart on code changes

## Next Steps (See todo.md)

1. Test multi-client scenarios
2. Implement UDP address tracking for voice
3. Add audio capture/playback in client
4. Test on Windows/macOS
5. Package for distribution

## Architecture Overview

**Server (Rust):**
- Tokio async runtime
- Axum WebSocket server
- SQLite database (rusqlite)
- UDP socket for voice packets
- In-memory session management

**Client (Tauri + React):**
- Tauri 2 (Rust + WebView)
- React 18 + TypeScript
- Tailwind CSS
- WebSocket client
- (Audio: Web Audio API - planned)

**Protocol:**
- JSON over WebSocket (control)
- Binary over UDP (voice - planned)
- Versioned protocol (1.0.0)

---

For detailed technical decisions, see [agent_decisions.md](agent_decisions.md)
For task breakdown and questions, see [todo.md](todo.md)
For change history, see [changelog.md](changelog.md)
