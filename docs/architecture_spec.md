# Nexum - Architecture Specification

**Complete technical architecture and design documentation — v0.5**

---

## Document Overview

This document contains the complete technical specification for Nexum, including:

- System architecture and design decisions
- Technology stack and dependencies
- Database schema and data models
- Communication protocols (WebSocket & UDP)
- Security model and best practices

**For user-focused documentation, see:** [../readme.md](../readme.md)  
**For development guides, see:** [quickstart.md](quickstart.md)

---

# 1. Vision

A minimal, elegant, self-hosted voice and text communication system.

Core principles:

- No mandatory central infrastructure
- No accounts
- No cloud storage
- No external data routing
- User-controlled servers
- Lightweight and efficient
- Clean UX for Windows and macOS

The product consists of:

- A standalone Rust server binary
- A desktop client (Tauri + TypeScript)

Servers are fully self-hosted.
All data lives on the host machine.
No message or voice traffic passes through external infrastructure.

---

# 2. High-Level Architecture

## Components

### Server (Rust)

- Independent binary
- Self-hosted
- Launchable manually or from client
- WebSocket (control)
- UDP (voice)
- SQLite persistence (local)

### Client (Tauri + TypeScript)

- Cross-platform desktop app
- Connects to remote servers
- Can spawn and manage local server process
- Handles UI and audio mixing

---

# 3. Hosting Model

- Server runs independently from client
- Client can spawn server as child process
- Server persists independently of client lifecycle
- If client closes, server can remain running

## Server Data Location

When launched **from the client** (GUI mode), the server always runs with its working directory set to:

```
~/.nexum/server/          (Windows: C:\Users\<user>\.nexum\server\)
```

Files created there:

```
~/.nexum/server/
├── server.toml           ← configuration (ports, admin password hash, limits)
└── data/
    └── server.db         ← SQLite database (users, channels, messages)
```

When launched **standalone** (CLI / `cargo run`), the server uses the current working directory:

```
<cwd>/
├── server.toml
└── data/
    └── server.db
```

The data path is configurable via the `--data-path` CLI argument or the `CONFIG_PATH` environment variable.

> ⚠️ The client never reads or writes these files. They belong exclusively to the server process.

## Build Pipeline

The server binary has **two deployment modes** that share the exact same executable:

| Mode | Description | Released as |
|------|-------------|-------------|
| **Standalone CLI** | Run directly from a terminal or service manager | `Nexum-Server_x.x.x_x64.exe` in GitHub Releases |
| **Embedded in client** | Bundled inside the Tauri installer; launched automatically when the user clicks "Start Server" | Inside `Nexum_x.x.x_x64_en-US.msi` / `-setup.exe` |

### Correct build order

`npm run tauri build` alone does **not** rebuild the server binary. The embedded `voice-server.exe` is a pre-compiled resource that must be manually rebuilt and copied before bundling the client:

```
# 1. Rebuild the server binary
cd server
cargo build --release

# 2. Copy into the Tauri resources folder
cp target/release/nexum-server.exe ../client/src-tauri/resources/voice-server.exe

# 3. Build + bundle the client installer
cd ../client
npm run tauri build
```

`build.ps1 -Release -Bundle` automates all three steps. **Never run only step 3** after server-side changes or the installer will ship stale server behaviour.

> ⚠️ A symptom of a stale server binary is that bug fixes committed in `server/src/` are not reflected at runtime even after reinstalling the client. Always check the file size of `client/src-tauri/resources/voice-server.exe` — it should match the freshly compiled binary.

### Chrome Private Network Access (PNA)

The Tauri WebView runs under the `tauri://localhost` origin. When the client's `fetch()` calls target a **private IP** (e.g. `192.168.x.x`, `10.x.x.x`), Chromium enforces the [Private Network Access](https://wicg.github.io/private-network-access/) spec and requires the server to include:

```
Access-Control-Allow-Private-Network: true
```

in CORS preflight responses. **WebSocket upgrade requests bypass PNA** (no preflight), which is why the main WS connection works while HTTP endpoints (avatar upload, avatar fetch) were silently blocked for non-host clients. The fix is `.allow_private_network(true)` on the `tower-http` `CorsLayer` in `server/src/websocket.rs`.

### Windows taskbar overlay icon

`CreateBitmap` (DDB) with a separate 1bpp AND mask is ignored on modern Windows when the source bitmap is 32bpp — the AND mask is not applied and the result is always a rectangle. The correct approach is `CreateDIBSection` (DIB, 32bpp) with per-pixel BGRA alpha: circle pixels at full opacity, outside pixels at alpha=0. This is what `client/src-tauri/src/main.rs` now uses for the unread-count badge.

---

# 4. Data Ownership

All data is stored:

- On the host machine
- Inside the server’s local SQLite database

If host deletes data directory → all data is lost.

We do not:

- Store user data
- Proxy traffic
- Record voice
- Route messages through external services

---

# 5. Identity Model

Each server manages identity locally.

## User Identity

- Each user gets:
  - `userId` (UUID, persistent per server)
  - `username` (editable display name)

Identity rules:

- `userId` is authoritative
- `username` can change
- Multiple users may share same username
- Identity is server-scoped

No global accounts.

---

# 6. Roles (MVP)

Two roles only:

- `owner`
- `member`

Owner permissions:

- Create/delete channels
- Kick users
- Modify server configuration

Members:

- Join channels
- Send messages
- Participate in voice

---

# 7. Persistence Model

Persistence is enabled by default.

Config example:

```json
{
  "persistenceEnabled": true,
  "dataPath": "./data"
}
```

If disabled:

- Server runs fully in memory
- All data lost on shutdown

---

# 8. Database Schema (MVP)

## users

- id (uuid, primary key)
- username (text)
- role (owner | member)
- created_at (timestamp)

## channels

- id (uuid)
- name (text)
- type (text | voice)
- max_users (integer)
- created_at (timestamp)

## messages

- id (uuid)
- channel_id (uuid)
- user_id (uuid)
- content (text, max 2000 chars)
- created_at (timestamp)

## call_history

- id (uuid)
- channel_id (uuid)
- started_at (timestamp)
- ended_at (timestamp)
- duration_seconds (integer)

## server_config

- id (uuid)
- max_users (integer)
- persistence_enabled (boolean)
- created_at (timestamp)

Sessions are in memory only.

---

# 9. Communication Protocol

## 9.1 Control Channel

Transport:

- WebSocket
- JSON payload
- Versioned protocol

### Handshake

Client → Server:

```json
{
  "type": "CONNECT",
  "payload": {
    "username": "string",
    "clientVersion": "1.0.0",
    "resumeSessionId": "optional"
  }
}
```

Server → Client (success):

```json
{
  "type": "WELCOME",
  "payload": {
    "sessionId": "uuid",
    "serverVersion": "1.0.0",
    "role": "owner | member"
  }
}
```

Error:

```json
{
  "type": "ERROR",
  "payload": {
    "code": "VERSION_MISMATCH | SERVER_FULL | INVALID_PAYLOAD"
  }
}
```

Major version must match.

---

## 9.2 Voice Channel

Transport:

- UDP
- Opus codec
- No server-side mixing

Packet structure:

```
[1 byte] protocol version
[16 bytes] sessionId (UUID)
[variable] opus encoded frame
```

Server behavior:

- Receives packet
- Identifies session
- Detects channel
- Forwards to channel members
- No ACK
- No retransmission

Clients mix audio locally.

---

# 10. Limits (Configurable)

Default configuration:

```json
{
  "maxUsers": 200,
  "maxUsersPerVoiceChannel": 100,
  "maxMessageSize": 2000
}
```

Server host assumes responsibility for resource capacity.

---

# 11. Security Model (MVP)

- Strict payload validation
- Rate limiting (messages)
- Message size limits
- No dynamic code execution
- No external dependencies for runtime logic

TLS:

- Not required in MVP
- Recommended via reverse proxy for internet exposure

---

# 12. Server Runtime Stack

Rust ecosystem:

- Tokio (async runtime)
- Axum or Actix (WebSocket)
- Tokio UDP sockets
- SQLite
- Serde (serialization)
- Tracing (structured logs)

Goals:

- <100MB RAM
- Low idle CPU
- Stable at 50–100 concurrent users

---

# 13. Client Stack

- Tauri
- TypeScript
- React
- Tailwind
- Native audio APIs
- Opus encoder/decoder

UI goals:

- Minimal
- Clean
- Dark modern aesthetic
- Zero friction onboarding

---

# 14. User Flow (MVP)

1. Download app
2. Enter username
3. Choose:
   - Create server
   - Join server

4. Connect
5. Communicate

No login.
No account.
No email.
No central identity.

---

# 15. Reconnections

- Automatic reconnect attempts
- `resumeSessionId` supported
- Session timeout (e.g. 60 seconds)
- If expired → new session created

---

# 16. Roadmap (MVP Phases)

## Phase 1 — Server Core

- Config loader
- WebSocket server
- UDP voice handler
- SQLite initialization

## Phase 2 — Domain Logic

- Users
- Channels
- Messaging
- Role enforcement

## Phase 3 — Voice Integration

- Opus encode/decode
- UDP forwarding
- Channel membership tracking

## Phase 4 — Client

- UI layout
- WebSocket client
- UDP client
- Voice mixing

## Phase 5 — Packaging

- Windows build
- macOS build
- Embedded server binary
- Installer

---

# 17. Non-Goals (MVP)

- No global user accounts
- No cloud relay
- No media file uploads
- No message editing
- No granular permissions
- No message reactions
- No bot framework

---

# 18. Product Positioning

This is:

- A minimal self-hosted alternative to
  - TeamSpeak
  - Mumble
  - Discord

But:

- With zero vendor lock-in
- No central dependency
- Lightweight modern UX
- Fully user-controlled infrastructure

---

# 19. Version

Specification Version: 0.5
Status: Architecturally Frozen for MVP Implementation

---

# 20. Technology Stack Details

## Server Stack (Rust)

### Core Dependencies

```toml
[dependencies]
# Async Runtime
tokio = { version = "1.36", features = ["full"] }

# WebSocket Server
axum = { version = "0.7", features = ["ws", "multipart"] }
tower-http = { version = "0.5", features = ["fs", "cors"] }

# Database
rusqlite = { version = "0.31", features = ["bundled"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Utilities
uuid = { version = "1.7", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
toml = "0.8"
```

### Resource Profile

**Memory Usage:**

- Idle: ~20-30 MB
- 50 users: ~50-80 MB
- 200 users: ~100-150 MB
- SQLite cache: ~10-20 MB

**CPU Usage:**

- Idle: <1%
- Active chat (50 users): 5-10%
- Voice forwarding: Depends on packet rate

**Disk I/O:**

- Message writes: Batched with WAL mode
- Database size: ~1KB per message, ~500 bytes per user
- Avatars: Stored as separate files

## Client Stack (Tauri + React)

### Core Dependencies

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-shell": "^2.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.0.2",
    "vite": "^5.0.8"
  }
}
```

### Build Output Sizes

**Windows:**

- `.msi` installer: ~3-4 MB
- `.exe` (NSIS): ~2-3 MB
- Unpacked app: ~8-10 MB

**macOS:**

- `.dmg`: ~5-6 MB
- `.app` bundle: ~10-12 MB

**Linux:**

- `.deb`: ~3-4 MB
- `.AppImage`: ~8-10 MB

---

# 21. Communication Protocol Details

## WebSocket Control Channel

### Message Format

All messages follow this structure:

```typescript
{
  "type": "MESSAGE_TYPE",
  "payload": { /* type-specific data */ }
}
```

### Client Messages

```typescript
type ClientMessage =
  | { type: 'CONNECT'; payload: ConnectPayload }
  | { type: 'CREATE_CHANNEL'; payload: CreateChannelPayload }
  | { type: 'DELETE_CHANNEL'; payload: DeleteChannelPayload }
  | { type: 'RENAME_CHANNEL'; payload: RenameChannelPayload }
  | { type: 'JOIN_CHANNEL'; payload: JoinChannelPayload }
  | { type: 'LEAVE_CHANNEL'; payload: LeaveChannelPayload }
  | { type: 'SEND_MESSAGE'; payload: SendMessagePayload }
  | { type: 'JOIN_VOICE'; payload: JoinVoicePayload }
  | { type: 'LEAVE_VOICE'; payload: LeaveVoicePayload }
  | { type: 'AUTHENTICATE_ADMIN'; payload: AuthenticateAdminPayload }
  | { type: 'GET_SERVER_SETTINGS' }
  | { type: 'UPDATE_SERVER_SETTINGS'; payload: UpdateServerSettingsPayload }
  | { type: 'GET_USERS' }
  | { type: 'UPDATE_AVATAR'; payload: UpdateAvatarPayload }
  | { type: 'PING' }
```

### Server Messages

```typescript
type ServerMessage =
  | { type: 'WELCOME'; payload: WelcomePayload }
  | { type: 'ERROR'; payload: ErrorPayload }
  | { type: 'CHANNEL_CREATED'; payload: ChannelCreatedPayload }
  | { type: 'CHANNEL_DELETED'; payload: ChannelDeletedPayload }
  | { type: 'CHANNEL_RENAMED'; payload: ChannelRenamedPayload }
  | { type: 'USER_JOINED'; payload: UserJoinedPayload }
  | { type: 'USER_LEFT'; payload: UserLeftPayload }
  | { type: 'MESSAGE'; payload: MessagePayload }
  | { type: 'MESSAGE_HISTORY'; payload: MessageHistoryPayload }
  | { type: 'ADMIN_AUTHENTICATED'; payload: AdminAuthenticatedPayload }
  | { type: 'VOICE_JOINED'; payload: VoiceJoinedPayload }
  | { type: 'VOICE_LEFT'; payload: VoiceLeftPayload }
  | { type: 'SERVER_SETTINGS'; payload: ServerSettingsPayload }
  | { type: 'SERVER_USERS'; payload: ServerUsersPayload }
  | { type: 'USER_AVATAR_UPDATED'; payload: UserAvatarUpdatedPayload }
  | { type: 'USER_UPDATED'; payload: UserUpdatedPayload }
  | { type: 'PONG' }
```

### Version Negotiation

**Client sends:**

```json
{
  "type": "CONNECT",
  "payload": {
    "username": "Alice",
    "client_version": "1.0.0"
  }
}
```

**Server validates:**

- Major version must match (1.x.x == 1.y.z)
- Minor/patch differences allowed
- Rejects with `VERSION_MISMATCH` error if incompatible

### Error Codes

```typescript
type ErrorCode =
  | 'VERSION_MISMATCH' // Client/server version incompatible
  | 'SERVER_FULL' // Max users reached
  | 'INVALID_PAYLOAD' // Malformed message
  | 'INVALID_REQUEST' // Invalid operation
  | 'UNAUTHORIZED' // Permission denied
  | 'CHANNEL_NOT_FOUND' // Channel doesn't exist
  | 'USER_NOT_FOUND' // User doesn't exist
  | 'RATE_LIMITED' // Too many requests
  | 'MESSAGE_TOO_LARGE' // Message exceeds limit
  | 'INTERNAL' // Server error
```

## UDP Voice Channel

### Packet Structure

```
┌─────────────┬──────────────────┬───────────────────┐
│ Version (1) │ Session ID (16)  │ Opus Data (var)   │
└─────────────┴──────────────────┴───────────────────┘
```

**Version Byte:**

- Protocol version (currently 1)
- Allows future protocol changes

**Session ID:**

- 16 bytes (UUID)
- Identifies sending user
- Server validates against active sessions

**Opus Data:**

- Variable length (typically 20-60ms frames)
- Compressed audio
- No error correction (UDP)

### Packet Flow

1. Client captures audio → encodes to Opus
2. Client prepends version + sessionId
3. Client sends UDP packet to server
4. Server validates sessionId
5. Server identifies user's current voice channel
6. Server forwards packet to all other users in channel
7. Clients decode Opus → mix → playback

**No server-side mixing:** Clients handle audio mixing locally.

---

# 22. Database Schema (Extended)

## SQLite Configuration

```sql
-- Enable Write-Ahead Logging for better concurrency
PRAGMA journal_mode = WAL;

-- Synchronous mode (NORMAL is fast + safe)
PRAGMA synchronous = NORMAL;

-- Foreign keys enforcement
PRAGMA foreign_keys = ON;

-- Auto-vacuum to reclaim space
PRAGMA auto_vacuum = INCREMENTAL;
```

## Complete Table Definitions

### users

```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,           -- UUID v4
    username TEXT NOT NULL,        -- Display name
    role TEXT NOT NULL,            -- 'owner' | 'member'
    avatar_url TEXT,               -- External avatar URL
    avatar_path TEXT,              -- Local avatar file path
    avatar_version INTEGER,        -- Cache-busting version
    created_at TEXT NOT NULL       -- ISO 8601 timestamp
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
```

### channels

```sql
CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,           -- UUID v4
    name TEXT NOT NULL,            -- Channel display name
    channel_type TEXT NOT NULL,    -- 'text' | 'voice'
    max_users INTEGER,             -- Null = unlimited
    created_at TEXT NOT NULL       -- ISO 8601 timestamp
);

CREATE INDEX idx_channels_type ON channels(channel_type);
```

### messages

```sql
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,           -- UUID v4
    channel_id TEXT NOT NULL,      -- Foreign key to channels
    user_id TEXT NOT NULL,         -- Foreign key to users
    content TEXT NOT NULL,         -- Message content (max 2000 chars)
    created_at TEXT NOT NULL,      -- ISO 8601 timestamp
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_channel ON messages(channel_id);
CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_messages_created ON messages(created_at);
```

### call_history (future)

```sql
CREATE TABLE IF NOT EXISTS call_history (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds INTEGER,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);
```

## Query Patterns

**Most frequent operations:**

1. **List messages for channel** (ORDER BY created_at DESC LIMIT 100)
2. **Insert new message** (Single INSERT)
3. **List users** (Simple SELECT with role filter)
4. **Update user avatar** (UPDATE by user_id)
5. **Create/delete channels** (INSERT/DELETE with owner check)

**Optimization notes:**

- Indexes on foreign keys for fast joins
- created_at index for chronological queries
- WAL mode allows concurrent reads during writes

---

# 23. Project File Structure

```
nexum/
├── server/                           # Rust backend
│   ├── Cargo.toml                   # Dependencies and build config
│   ├── src/
│   │   ├── main.rs                  # Entry point, server initialization
│   │   ├── config.rs                # TOML config loading/saving
│   │   ├── db.rs                    # SQLite operations (CRUD)
│   │   ├── models.rs                # Protocol types, DTOs
│   │   ├── websocket.rs             # Axum WebSocket server setup
│   │   ├── handlers.rs              # Message handlers (CONNECT, etc.)
│   │   ├── session.rs               # In-memory session manager
│   │   ├── udp.rs                   # UDP voice packet handler
│   │   └── avatar.rs                # Avatar upload/management
│   ├── data/                        # Created at runtime
│   │   └── nexum.db             # SQLite database
│   ├── avatars/                     # User avatar files
│   └── server.toml                  # Server configuration
│
├── client/                           # Tauri desktop app
│   ├── package.json                 # Node.js dependencies
│   ├── vite.config.ts               # Vite build configuration
│   ├── tsconfig.json                # TypeScript configuration
│   ├── tailwind.config.js           # Tailwind CSS customization
│   ├── src/                         # React frontend
│   │   ├── main.tsx                 # React entry point
│   │   ├── App.tsx                  # Main app state & routing
│   │   ├── index.css                # Global styles (Tailwind)
│   │   ├── lib/
│   │   │   ├── websocket.ts         # WebSocket client wrapper
│   │   │   └── serverManager.ts     # Multi-server management
│   │   ├── types/
│   │   │   ├── protocol.ts          # Protocol definitions (sync with server)
│   │   │   └── server.ts            # Client-side types
│   │   └── components/
│   │       ├── ServerListView.tsx   # Server selection screen
│   │       ├── ConnectView.tsx      # Username entry modal
│   │       ├── MainView.tsx         # Main chat layout
│   │       ├── ChannelList.tsx      # Channel sidebar
│   │       ├── ChatArea.tsx         # Message display & input
│   │       ├── UserListPanel.tsx    # Right sidebar user list
│   │       └── [11 modal components] # Settings, avatars, etc.
│   ├── src-tauri/                   # Tauri Rust backend
│   │   ├── Cargo.toml               # Tauri dependencies
│   │   ├── tauri.conf.json          # App metadata, permissions
│   │   ├── build.rs                 # Build script
│   │   └── src/
│   │       ├── main.rs              # Tauri commands (server control)
│   │       └── server_manager.rs    # Local server lifecycle
│   ├── dist/                        # Vite build output
│   └── target/                      # Cargo build output
│
├── docs/                             # Documentation
│   ├── architecture_spec.md          # This file
│   ├── quickstart.md                 # Development guide
│   ├── changelog.md                  # Development history
│   ├── todo.md                       # Task tracking
│   ├── agent_decisions.md            # Technical decisions log
│   ├── definition_of_done.md         # Contribution standards
│   ├── USER_FLOW.md                  # User journey
│   └── CLIENT_SERVER_INTEGRATION.md  # Integration design
│
├── readme.md                         # Main project README (user-focused)
├── build.ps1                         # Unified build script (Windows)
├── dev.ps1                           # Development helper (Windows)
└── .gitignore                        # Git ignore rules
```

---

# 24. Security Best Practices

## Production Deployment Checklist

### Network Security

- [ ] **Reverse proxy** (nginx, Caddy, Traefik)
  - Terminates TLS/SSL
  - Rate limiting
  - Request filtering
- [ ] **Firewall rules**
  - Allow only WebSocket (8080) and UDP (9000)
  - Restrict admin endpoints to trusted IPs if possible
- [ ] **DDoS protection**
  - Cloudflare or similar if internet-facing
  - Connection rate limits
  - Packet rate limits for UDP

### Server Hardening

- [ ] **Strong admin password**
  - Minimum 12 characters
  - Use password manager
  - Rotate periodically
- [ ] **Regular backups**
  - Backup `nexum.db` daily
  - Backup `server.toml` configuration
  - Test restore procedure
- [ ] **File permissions**
  - Database: 600 (owner read/write only)
  - Config: 600
  - Avatar directory: 755
- [ ] **Resource limits**
  - Set max_users appropriately
  - Monitor disk usage (message history)
  - Set max_message_size conservatively

### Application Security

- [ ] **Input validation** (already implemented)
  - All payloads validated against schema
  - Message length limits enforced
  - File upload validation (type, size)
- [ ] **Rate limiting** (already implemented)
  - Message send rate per user
  - Connection attempt rate
  - API endpoint limits
- [ ] **Session security**
  - Session timeout (60 seconds default)
  - Secure session ID generation (UUID v4)
  - Session invalidation on disconnect

### Monitoring

- [ ] **Log monitoring**
  - Failed authentication attempts
  - Unusual activity patterns
  - Error rate spikes
- [ ] **Resource monitoring**
  - CPU/RAM usage
  - Database size growth
  - Connection count
- [ ] **Backup verification**
  - Test restores monthly
  - Verify backup integrity

---

# 25. Performance Characteristics

## Benchmarks (Approximate)

### Message Throughput

**Test:** 50 users sending 1 msg/sec to same channel

- Latency p50: 5-10ms
- Latency p95: 15-25ms
- Latency p99: 30-50ms
- Server CPU: 8-12%
- Server RAM: 60-80 MB

### Connection Handling

**Test:** Sequential connections

- Time to connect: 10-20ms
- Handshake overhead: <5ms
- Session creation: <2ms
- Authentication check: <1ms

### Database Performance

**Operation speeds (SQLite):**

- Insert message: 0.5-2ms
- Query last 100 messages: 2-5ms
- List users: <1ms
- Update user: <1ms
- Create channel: 1-3ms

### Voice Forwarding

**Packet handling:**

- Receive → Forward latency: <5ms
- Packet loss: Depends on network
- Jitter: Minimal server contribution
- CPU per 100 packets/sec: ~2-3%

## Scalability Limits

### Single Server (Default Config)

- **Max users:** 200 (configurable)
- **Max channels:** Unlimited (practical: ~100-500)
- **Max messages:** Millions (paginate in UI)
- **Voice channels:** Up to 100 users per channel

### Bottlenecks

1. **UDP forwarding:** CPU-bound at high packet rates
2. **SQLite writes:** I/O-bound with many concurrent messages
3. **WebSocket connections:** Memory-bound (1-2 MB per connection)
4. **Avatar storage:** Disk space (10 MB per user if all upload)

### Optimization Strategies

- **Horizontal scaling:** Not supported (stateful server)
- **Database optimization:**
  - Use WAL mode (already enabled)
  - Periodic VACUUM to reclaim space
  - Archive old messages
- **Memory optimization:**
  - Limit message history cache
  - Prune inactive sessions
- **CPU optimization:**
  - Use release builds (--release flag)
  - Optimize UDP packet batching (future)

---

# 26. Comparison with Similar Tools

## vs. Discord

| Feature           | Nexum                        | Discord                |
| ----------------- | ---------------------------- | ---------------------- |
| Hosting           | Self-hosted                  | Cloud-only             |
| Privacy           | Full control                 | Data stored by Discord |
| Accounts          | None (username only)         | Required               |
| Voice quality     | Opus (good)                  | Opus (good)            |
| File sharing      | Not supported (MVP)          | Yes                    |
| Bots/integrations | Not supported (MVP)          | Extensive              |
| Mobile apps       | Planned                      | Yes                    |
| Screen sharing    | Not supported                | Yes                    |
| Resource usage    | <100 MB RAM                  | Client: 300-600 MB     |
| Setup complexity  | Moderate (self-host)         | Easy (cloud)           |
| Cost              | Server hosting only (~$5/mo) | Free / $10mo for Nitro |

## vs. TeamSpeak

| Feature       | Nexum                  | TeamSpeak                   |
| ------------- | ---------------------- | --------------------------- |
| Hosting       | Self-hosted            | Self-hosted or cloud        |
| License       | Open source (TBD)      | Proprietary                 |
| UI            | Modern (React)         | Dated                       |
| Text chat     | Full support           | Basic                       |
| Voice quality | Opus                   | CELT/Opus/Speex             |
| Max users     | 200 (configurable)     | 32 (free), unlimited (paid) |
| Setup         | Simple (single binary) | Complex (server + client)   |
| Database      | SQLite                 | MariaDB/SQLite              |

## vs. Mumble

| Feature             | Nexum                  | Mumble                    |
| ------------------- | ---------------------- | ------------------------- |
| Hosting             | Self-hosted            | Self-hosted               |
| License             | Open source (TBD)      | BSD (open source)         |
| UI                  | Modern (React + Tauri) | Qt (functional but dated) |
| Text chat           | Full support           | Basic                     |
| Voice quality       | Opus                   | Opus/CELT                 |
| Latency             | Low                    | Very low (optimized)      |
| Setup               | Easy                   | Moderate                  |
| Message persistence | Yes (SQLite)           | No (memory only)          |
| Channel management  | UI + roles             | ACL-based                 |

---

# 27. Future Architectural Considerations

## Planned Enhancements

### Phase 1: Core Features

- Private messaging (DMs)
- End-to-end encryption for DMs
- Message search
- History pagination

### Phase 2: Voice Improvements

- Voice activity detection (VAD)
- Push-to-talk keybindings
- Audio device selection
- Volume controls per user

### Phase 3: Scalability

- Message archival system
- Database vacuum automation
- Performance monitoring dashboard
- Resource usage alerts

### Phase 4: Advanced Features

- File sharing (with size limits)
- Markdown in messages
- Code syntax highlighting
- Emoji/reactions
- Typing indicators

## Architectural Constraints

**Not Planned:**

- Federation (each server is independent)
- Blockchain/distributed ledger
- Built-in video calls (too complex for MVP)
- Bots/plugins (security concerns)
- Mobile apps (requires separate effort)

---

**Document Version:** 2.0 (Extended)  
**Last Updated:** 2026-02-23  
**Status:** Living Document (core architecture frozen, details may evolve)

---
