# TODO List - Voice MVP

## Phase 0: Project Setup ✅ (In Progress)

- [x] Create documentation structure
- [x] Define technology stack
- [ ] Create server project with Cargo.toml
- [ ] Create client project with Tauri
- [ ] Create protocol types definition

---

## Phase 1: Server Core

### 1.1 Project Structure
- [ ] Initialize Cargo project in `server/`
- [ ] Set up folder structure:
  - [ ] `src/main.rs`
  - [ ] `src/config.rs`
  - [ ] `src/db.rs`
  - [ ] `src/websocket.rs`
  - [ ] `src/udp.rs`
  - [ ] `src/models.rs`
  - [ ] `src/handlers.rs`
- [ ] Add all dependencies to Cargo.toml

**Questions:**
- Should we use structopt/clap for CLI args or just env vars?
- Default port for WebSocket (8080?) and UDP (9000?)?

### 1.2 Configuration
- [ ] Create `server.toml` example
- [ ] Implement config loader with serde
- [ ] Add default values
- [ ] Support environment variable overrides

**Questions:**
- Store config in same folder as binary or in ~/AppName/?
- Should maxUsers be runtime changeable or restart required?

### 1.3 Database Setup
- [ ] Define SQL schema (users, channels, messages, call_history, server_config)
- [ ] Create `schema.sql` migration file
- [ ] Implement SQLite connection pool
- [ ] Write init_db() function
- [ ] Add basic CRUD for users table

**Questions:**
- Use connection pool or single connection for MVP?
- Should we implement soft deletes or hard deletes?

### 1.4 WebSocket Server
- [ ] Set up Axum router
- [ ] Implement WebSocket upgrade handler
- [ ] Create session manager (HashMap)
- [ ] Implement CONNECT handshake
- [ ] Implement WELCOME response
- [ ] Implement ERROR responses
- [ ] Add ping/pong keepalive

**Questions:**
- Should we validate username characters/length?
- Max concurrent connections per IP?

---

## Phase 2: Domain Logic

### 2.1 User Management
- [ ] Create user on first connect
- [ ] Assign userId (UUID)
- [ ] Store in database
- [ ] Handle username changes
- [ ] Implement role assignment (owner vs member)

**Questions:**
- First user is always owner?
- Can owner role be transferred?

### 2.2 Channel Management
- [ ] CREATE_CHANNEL message handler
- [ ] DELETE_CHANNEL message handler
- [ ] LIST_CHANNELS message handler
- [ ] JOIN_CHANNEL logic
- [ ] LEAVE_CHANNEL logic
- [ ] Enforce max_users per channel

**Questions:**
- Should channels have descriptions?
- Allow channel renaming?

### 2.3 Text Messaging
- [ ] SEND_MESSAGE handler
- [ ] Validate message size (2000 chars)
- [ ] Store in database
- [ ] Broadcast to channel members
- [ ] Implement rate limiting (basic counter)

**Questions:**
- Rate limit: messages per minute per user?
- Should empty messages be allowed?

### 2.4 Role Enforcement
- [ ] Check permissions for channel creation
- [ ] Check permissions for channel deletion
- [ ] Check permissions for kick actions
- [ ] Return ERROR on unauthorized actions

---

## Phase 3: Voice Integration

### 3.1 UDP Server
- [ ] Bind UDP socket
- [ ] Parse incoming packets (version + sessionId + opus)
- [ ] Validate session exists
- [ ] Identify user's current voice channel
- [ ] Forward packet to all other channel members
- [ ] Handle errors gracefully (no crash on bad packets)

**Questions:**
- Should we validate Opus frame structure?
- Drop packets from non-authenticated sessions?

### 3.2 Voice Channel State
- [ ] Track active voice connections per channel
- [ ] JOIN_VOICE handler
- [ ] LEAVE_VOICE handler
- [ ] Notify channel members on join/leave
- [ ] Enforce max_users_per_voice_channel

**Questions:**
- Auto-leave voice on disconnect?
- Should we track "speaking" state?

### 3.3 Call History
- [ ] Log call start time
- [ ] Log call end time
- [ ] Calculate duration
- [ ] Store in call_history table

---

## Phase 4: Client

### 4.1 Project Setup
- [ ] Initialize Tauri project
- [ ] Set up React + TypeScript
- [ ] Configure Tailwind CSS
- [ ] Create basic app layout
- [ ] Set up routing (if needed)

### 4.2 Connection UI
- [ ] Username input field
- [ ] Server address input (IP:PORT)
- [ ] Connect button
- [ ] Connection status indicator
- [ ] Error message display

**Questions:**
- Remember last username in localStorage?
- Validate username before connecting?

### 4.3 WebSocket Client
- [ ] Implement WebSocket connection
- [ ] Send CONNECT message
- [ ] Handle WELCOME response
- [ ] Handle ERROR response
- [ ] Implement auto-reconnect logic
- [ ] Send ping/pong

**Questions:**
- Reconnect backoff strategy? (immediate, 1s, 2s, 4s, max 10s?)
- Show reconnection attempts to user?

### 4.4 Main UI
- [ ] Channel list sidebar
- [ ] Text chat area
- [ ] Message input
- [ ] User list
- [ ] Voice controls (mute, deafen, disconnect)

**Questions:**
- Should UI be collapsible/resizable?
- Show timestamps on messages?

### 4.5 Audio Capture
- [ ] Request microphone permission
- [ ] Capture audio with Web Audio API
- [ ] Encode to Opus
- [ ] Send via UDP
- [ ] Implement push-to-talk or voice activation?

**Questions:**
- Default to push-to-talk or always-on with voice activation?
- Show volume meter?

### 4.6 Audio Playback
- [ ] Receive UDP packets
- [ ] Decode Opus frames
- [ ] Mix multiple speakers
- [ ] Play through AudioContext
- [ ] Handle packet loss gracefully

**Questions:**
- Buffer size for jitter handling?
- Show speaking indicator for each user?

---

## Phase 5: Packaging

### 5.1 Server Binary
- [ ] Cross-compile for Windows x64
- [ ] Cross-compile for macOS (Intel + ARM)
- [ ] Test binary standalone
- [ ] Create default config file

### 5.2 Client Bundling
- [ ] Embed server binary in Tauri resources
- [ ] Implement "Start Local Server" button
- [ ] Spawn server process from client
- [ ] Display server logs in UI (optional)
- [ ] Handle server process lifecycle

**Questions:**
- Should client auto-start embedded server on launch?
- Where to store server data when launched from client?

### 5.3 Installers
- [ ] Build Windows .msi with Tauri
- [ ] Build macOS .dmg with Tauri
- [ ] Add app icon
- [ ] Add proper app metadata
- [ ] Test installation flow

---

## Phase 6: Polish

### 6.1 Error Handling
- [ ] User-friendly error messages
- [ ] Handle network failures gracefully
- [ ] Show connection state clearly
- [ ] Add retry mechanisms

### 6.2 UX Improvements
- [ ] Loading states
- [ ] Empty states (no channels, no messages)
- [ ] Keyboard shortcuts
- [ ] Sound notifications (optional)

### 6.3 Testing
- [ ] Manual test full flow
- [ ] Test with 2+ clients
- [ ] Test voice with multiple users
- [ ] Test reconnection scenarios
- [ ] Test server restart scenarios

---

## Non-MVP (Deferred)

- [ ] TLS support
- [ ] Message history pagination
- [ ] Message search
- [ ] User profile pictures
- [ ] Custom emojis/reactions
- [ ] File uploads
- [ ] Screen sharing
- [ ] Video chat
- [ ] Mobile apps
- [ ] Web client
- [ ] Multi-server support in single client
- [ ] Server discovery/browser
- [ ] Invite links

---

## Known Blockers/Risks

1. **Opus encoding in browser**: Need to test browser support, may need WASM library
2. **UDP in Tauri**: Verify Node UDP or Rust UDP through Tauri commands
3. **Audio mixing complexity**: May need audio engineering expertise
4. **Cross-platform testing**: Need access to both Windows and macOS
5. **NAT traversal**: Users may need port forwarding for voice (acceptable for MVP)

---

*Last updated: 2026-02-21*
