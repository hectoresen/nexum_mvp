# Agent Decisions Log

## Project Setup Decisions

### Date: 2026-02-21

#### Technology Stack Choices

**Server (Rust):**
- **Tokio** (1.36+): Async runtime - standard choice for Rust async
- **Axum** (0.7+): WebSocket server - simpler than Actix, better ergonomics
- **tokio-tungstenite**: WebSocket implementation for Axum
- **rusqlite**: SQLite driver - lighter than diesel/sqlx for MVP
- **serde + serde_json**: JSON serialization - mandatory for JSON protocol
- **uuid**: UUID generation with v4 and serde features
- **tracing + tracing-subscriber**: Structured logging
- **tokio::net::UdpSocket**: Built-in UDP support, no extra dependency

**Client (Tauri):**
- **Tauri v2**: Latest stable, better performance than v1
- **React 18**: UI framework - specified in README
- **TypeScript 5**: Type safety for protocol
- **Tailwind CSS**: Utility-first styling - specified in README
- **Vite**: Build tool (comes with Tauri)
- **Web Audio API**: Native browser audio capture/playback
- **opus-encoder** (via npm): For Opus codec in browser

#### Architecture Decisions

1. **Monorepo Structure**:
   ```
   voice_mvp/
   ├── server/           # Rust binary
   ├── client/           # Tauri app
   └── protocol/         # Shared TypeScript types (copied, not shared build)
   ```
   - Reason: Keeps relativity simple, no workspace complexity for MVP
   - Server and client are separate build processes

2. **Protocol Definition**:
   - Define types in TypeScript first (client-side)
   - Manually sync with Rust structs (no code generation for MVP)
   - Single source of truth: `protocol/types.ts`

3. **WebSocket vs REST**:
   - WebSocket only for control plane (no REST API)
   - Reason: Real-time by default, simpler than hybrid approach

4. **UDP Design**:
   - Server acts as simple forwarding relay
   - No server-side audio processing/mixing
   - Clients handle all audio encoding/decoding locally
   - Packet format: [version:1][sessionId:16][opus_data:variable]

5. **Database**:
   - SQLite with file-based storage
   - Default path: `~/AppName/servers/<serverId>/data.db`
   - Schema migrations: manual SQL for MVP (no ORM migrations)

6. **Session Management**:
   - In-memory HashMap for active sessions
   - sessionId generated on CONNECT
   - No Redis/external state store needed

7. **Error Handling Philosophy**:
   - Use Result<T, E> everywhere in Rust
   - Send ERROR messages to client instead of silent failures
   - Log all errors with tracing::error!

8. **Configuration**:
   - Single `server.toml` file (TOML format)
   - Environment variables as overrides
   - Defaults built into code

#### Deferred/Simplified for MVP

1. **TLS**: Not implemented, users can use reverse proxy
2. **Authentication**: None - just username on connect
3. **Rate Limiting**: Basic counter, no sophisticated algorithm
4. **File Uploads**: Not in MVP
5. **Message Persistence**: Implemented but queryable history deferred
6. **Reconnection Logic**: Basic retry, no sophisticated backoff
7. **Voice Quality Options**: Single bitrate, no adaptive logic

#### Key Technical Constraints

- Max message size: 2000 chars
- Max users per server: 200 (configurable)
- Max users per voice channel: 100 (configurable)
- Session timeout: 60 seconds
- WebSocket ping interval: 30 seconds
- UDP packet max size: 1472 bytes (Ethernet MTU safe)

#### Build & Packaging Strategy

- Server: Single binary with `cargo build --release`
- Client: Tauri bundler for Windows (.msi) and macOS (.dmg)
- Server binary embedded in client app resources
- Client can spawn server as child process with `std::process::Command`

#### Dependencies Versioning

Using latest stable versions as of Feb 2026:
- Rust edition 2021
- Node 20 LTS
- TypeScript 5.x
- React 18.x

#### Testing Strategy for MVP

- Server: Integration tests for WebSocket handshake
- Client: Manual testing only for MVP
- No E2E automation initially
- Unit tests for critical parsing logic

#### Platform Support

Initial targets:
- Windows 10/11 (x64)
- macOS 12+ (Intel + Apple Silicon)
- Linux support deferred (easy to add later)

---

## Questions/Uncertainties

1. **Audio Mixing**: Should client mix all streams or play overlapped? 
   - **Decision**: Mix using Web Audio API GainNode + AudioContext destination

2. **Server Discovery**: How do users share server addresses?
   - **Decision**: Manual IP:PORT entry for MVP, no discovery service

3. **Server Identity**: Should server have a name/ID?
   - **Decision**: Yes, serverId (UUID) generated on first run, stored in config

4. **Voice Channel Auto-join**: Should users auto-join voice when joining text channel?
   - **Decision**: No, explicit join required (separate action)

5. **Simultaneous Voice Channels**: Can user be in multiple at once?
   - **Decision**: No, one voice channel per user at a time

---

*This document tracks all architectural and technical decisions made during development.*
