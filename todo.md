# TODO List - Voice MVP

## 🚧 Phase 0.5: Client-Server Integration (IN PROGRESS)

**Priority: HIGH - Current Focus**

This phase integrates the CLI server with the client for a unified user experience.

### 0.5.1 Installation Architecture 🚧
- [ ] Design unified installation structure
  - Client and server in same directory
  - Shared resources folder
  - Single data directory for local server
- [ ] Update build scripts to bundle both executables
- [ ] Configure Tauri bundle to include server binary
- [ ] Test installation on clean Windows system

### 0.5.2 Server Detection 🚧
- [ ] Create `server_manager.rs` module in client backend
- [ ] Implement `detect_local_server()` function
- [ ] Implement `get_server_path()` function
- [ ] Add Tauri command `is_server_installed()`
- [ ] Test detection logic with various installation paths

### 0.5.3 Server Control 🚧
- [ ] Implement `start_local_server()` command
  - Launch server process with `--non-interactive`
  - Track process handle in AppState
  - Monitor process status
- [ ] Implement `stop_local_server()` command
  - Graceful shutdown with kill signal
  - Clean up process handle
- [ ] Implement `get_server_status()` command
- [ ] Add process crash detection and recovery

### 0.5.4 Initial Setup Flow 🚧
- [ ] Create `ServerSetupModal` component
  - Password input field
  - Generate random password button
  - Show/hide password toggle
  - Validation (min 8 chars)
- [ ] Implement first-run detection
  - Check if `server.toml` exists
  - Show setup modal if not configured
- [ ] Call server with `--admin-password` on first setup
- [ ] Save password securely in client storage

### 0.5.5 UI Components 🚧
- [ ] Create `LocalServerPanel` component
  - Server status indicator (running/stopped/error)
  - Start/Stop buttons
  - Current address display (localhost:8080)
  - Quick reconnect button
- [ ] Integrate panel into `ConnectView`
- [ ] Add "Local Server" vs "Remote Server" tabs
- [ ] Update styling for new components

### 0.5.6 Auto-Connection 🚧
- [ ] Auto-connect to localhost after starting server
- [ ] Use saved admin password for authentication
- [ ] Handle connection failures gracefully
- [ ] Add retry logic with backoff

### 0.5.7 Configuration Management 🚧
- [ ] Add "Local Server Settings" to Settings modal
  - Change admin password
  - Change server ports
  - Toggle auto-start on client launch
  - View server logs
- [ ] Implement config file editing
- [ ] Restart server when config changes
- [ ] Validate configuration before applying

### 0.5.8 Setup Wizard 🚧
- [ ] Create first-launch wizard component
  - Welcome screen
  - "Host local" vs "Connect remote" choice
  - Server configuration (if hosting)
  - Connection test
- [ ] Save wizard completion state
- [ ] Skip wizard on subsequent launches

### 0.5.9 Build & Distribution 🚧
- [ ] Create unified build script
  - Build server binary first
  - Build client with bundled server
  - Generate installer (.msi)
- [ ] Test installer on clean machine
- [ ] Verify both client and server are installed
- [ ] Test uninstallation (clean removal)

### 0.5.10 Documentation 🚧
- [ ] Update README with new installation process
- [ ] Create user guide for local server mode
- [ ] Document troubleshooting steps
- [ ] Add FAQ for common issues

**Reference:** See [CLIENT_SERVER_INTEGRATION.md](CLIENT_SERVER_INTEGRATION.md) for detailed design.

---

## ✅ Phase 0: Project Setup (COMPLETED)

- [x] Create documentation structure
- [x] Define technology stack
- [x] Create server project with Cargo.toml
- [x] Create client project with Tauri
- [x] Create protocol types definition

---

## ✅ Phase 1: Server Core (COMPLETED)

### 1.1 Project Structure ✅
- [x] Initialize Cargo project in `server/`
- [x] Set up folder structure (all files created)
- [x] Add all dependencies to Cargo.toml

**Decisions Made:**
- Using env vars and TOML config (no CLI args for MVP)
- Default ports: WebSocket (8080), UDP (9000)

### 1.2 Configuration ✅
- [x] Create `server.toml` example
- [x] Implement config loader with serde
- [x] Add default values
- [x] Support environment variable overrides

**Decisions Made:**
- Config in `./server.toml` (same folder)
- maxUsers requires restart to change

### 1.3 Database Setup ✅
- [x] Define SQL schema (users, channels, messages, call_history, server_config)
- [x] Implement SQLite connection (Arc<Mutex<Connection>>)
- [x] Write init_db() function
- [x] Add CRUD for users, channels, messages

**Decisions Made:**
- Single connection wrapped in Arc<Mutex> (sufficient for MVP)
- Hard deletes (no soft delete for MVP)

### 1.4 WebSocket Server ✅
- [x] Set up Axum router
- [x] Implement WebSocket upgrade handler
- [x] Create session manager (HashMap)
- [x] Implement CONNECT handshake
- [x] Implement WELCOME response
- [x] Implement ERROR responses
- [x] Add ping/pong keepalive

**Decisions Made:**
- No username validation (accepts any string 1-32 chars)
- No per-IP connection limit for MVP

---

## ✅ Phase 2: Domain Logic (COMPLETED)

### 2.1 User Management ✅
- [x] Create user on first connect
- [x] Assign userId (UUID)
- [x] Store in database
- [x] Handle username changes (DB method exists)
- [x] Implement role assignment (owner vs member)

**Decisions Made:**
- First user is always owner
- Owner role transfer not implemented in MVP

### 2.2 Channel Management ✅
- [x] CREATE_CHANNEL message handler
- [x] DELETE_CHANNEL message handler
- [x] LIST_CHANNELS (sent on WELCOME)
- [x] JOIN_CHANNEL logic
- [x] LEAVE_CHANNEL logic
- [x] Enforce max_users per channel

**Decisions Made:**
- No channel descriptions for MVP
- No channel renaming for MVP

### 2.3 Text Messaging ✅
- [x] SEND_MESSAGE handler
- [x] Validate message size (2000 chars)
- [x] Store in database
- [x] Broadcast to channel members
- [x] Rate limiting (basic structure, not enforced)

**Decisions Made:**
- Rate limit: 60 messages/minute (configured, not enforced yet)
- Empty messages blocked by UI

### 2.4 Role Enforcement ✅
- [x] Check permissions for channel creation
- [x] Check permissions for channel deletion
- [x] Return ERROR on unauthorized actions
- [ ] Kick actions (deferred to future)

---

## ⚠️ Phase 3: Voice Integration (PARTIAL)

### 3.1 UDP Server ⚠️
- [x] Bind UDP socket
- [x] Parse incoming packets (version + sessionId + opus)
- [x] Validate session exists
- [x] Identify user's current voice channel
- [ ] 🚧 **Forward packet to all other channel members** (needs UDP address tracking)
- [x] Handle errors gracefully (no crash on bad packets)

**Known Issue:** UDP address registration per session not implemented

**Decisions Made:**
- Validate packet structure, drop invalid
- Drop packets from non-authenticated sessions

### 3.2 Voice Channel State ✅
- [x] Track active voice connections per channel
- [x] JOIN_VOICE handler
- [x] LEAVE_VOICE handler
- [x] Notify channel members on join/leave
- [x] Enforce max_users_per_voice_channel

**Decisions Made:**
- Auto-leave voice on disconnect (yes)
- No "speaking" state tracking for MVP

### 3.3 Call History ❌
- [ ] Log call start time (deferred)
- [ ] Log call end time (deferred)
- [ ] Calculate duration (deferred)
- [ ] Store in call_history table (schema exists, not used)

---

## ✅ Phase 4: Client (MOSTLY COMPLETE)

### 4.1 Project Setup ✅
- [x] Initialize Tauri project
- [x] Set up React + TypeScript
- [x] Configure Tailwind CSS
- [x] Create basic app layout
- [x] No routing needed (single view app)

### 4.2 Connection UI ✅
- [x] Username input field
- [x] Server address input (IP:PORT)
- [x] Connect button
- [x] Connection status indicator
- [x] Error message display

**Decisions Made:**
- No localStorage for username (fresh each time)
- No pre-connect validation (server validates)

### 4.3 WebSocket Client ✅
- [x] Implement WebSocket connection
- [x] Send CONNECT message
- [x] Handle WELCOME response
- [x] Handle ERROR response
- [x] Implement auto-reconnect logic
- [x] Ping/pong handling

**Decisions Made:**
- Reconnect backoff: 1s, 2s, 4s, 8s, max 10s (exponential)
- Show reconnection in connection status (not separate UI)

### 4.4 Main UI ✅
- [x] Channel list sidebar
- [x] Text chat area
- [x] Message input
- [x] Voice controls UI (non-functional)
- [ ] User list per channel (deferred)

**Decisions Made:**
- Fixed layout (no resizing for MVP)
- Show timestamps on messages (yes)

### 4.5 Audio Capture ❌ (NOT IMPLEMENTED)
- [ ] 🚧 Request microphone permission
- [ ] 🚧 Capture audio with Web Audio API
- [ ] 🚧 Encode to Opus (need WASM library)
- [ ] 🚧 Send via UDP
- [ ] 🚧 Implement push-to-talk

**Blocker:** Requires audio engineering expertise and Opus WASM library

### 4.6 Audio Playback ❌ (NOT IMPLEMENTED)
- [ ] 🚧 Receive UDP packets (need Tauri UDP bridge)
- [ ] 🚧 Decode Opus frames
- [ ] 🚧 Mix multiple speakers
- [ ] 🚧 Play through AudioContext
- [ ] 🚧 Handle packet loss

**Blocker:** Requires audio implementation + UDP in Tauri

---

## 🎯 Phase 5: Packaging (CURRENT FOCUS)

### 5.1 Server Binary
- [ ] Cross-compile for Windows x64
- [ ] Cross-compile for macOS (Intel + ARM)
- [ ] Test binary standalone
- [x] Create default config structure (creates server.example.toml)

### 5.2 Client Bundling (DEFERRED)
- [ ] Embed server binary in Tauri resources
- [ ] Implement "Start Local Server" button
- [ ] Spawn server process from client
- [ ] Display server logs in UI (optional)
- [ ] Handle server process lifecycle

**Decisions:**
- Defer server embedding for MVP
- Focus on standalone client installer first

### 5.3 Installers ✅ **LINUX COMPLETE, WINDOWS DOCUMENTED**
- [x] 🎯 **Verify client compiles successfully**
- [x] 🎯 **Create app icons (PNG, ICO, ICNS)** - Generated via Tauri CLI from SVG
- [x] 🎯 **Configure bundle metadata in tauri.conf.json**
- [x] 🎯 **Build Linux bundles with Tauri** - Generated `.deb`, `.rpm`, `.AppImage`
- [ ] 🎯 **Build Windows .msi with Tauri** - Requires compilation on Windows (see [windows_build_guide.md](windows_build_guide.md))
- [ ] 🎯 **Test installation on Windows** - Pending Windows build
- [ ] Build macOS .dmg with Tauri (later)
- [ ] Test installation flow on macOS (later)

**Status:**
- ✅ Linux builds successful (3.8 MB `.deb`, 74 MB `.AppImage`)
- 📝 Windows build guide created with complete instructions
- ⚠️ Windows `.msi` requires native Windows compilation (not WSL)
- 📦 Build artifacts: `client/src-tauri/target/release/bundle/`

---

## Phase 6: Polish (DEFERRED)

### 6.1 Error Handling
- [x] User-friendly error messages (basic)
- [x] Handle network failures gracefully
- [x] Show connection state clearly
- [x] Auto-reconnect mechanism
- [ ] Better error details (can improve)

### 6.2 UX Improvements
- [ ] Loading states (basic spinners)
- [x] Empty states (no channels, no messages)
- [ ] Keyboard shortcuts
- [ ] Sound notifications

### 6.3 Testing
- [ ] Manual test full flow
- [ ] Test with 2+ clients simultaneously
- [ ] Test voice with multiple users (when audio implemented)
- [x] Test reconnection scenarios (basic)
- [ ] Test server restart scenarios

---

## ❌ Non-MVP (Explicitly Deferred)

All features below are OUT OF SCOPE for initial release:

- [ ] TLS support (use reverse proxy)
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
- [ ] Message editing
- [ ] Message deletion

---

## 🚨 Current Blockers & Next Steps

### Immediate (This Session)
1. ✅ **Update todo.md** - DONE
2. ✅ **Verify client builds** - DONE (Linux bundles successful)
3. ✅ **Create app icons** - DONE (generated from SVG)
4. 📝 **Build Windows installer** - DOCUMENTED (requires Windows OS)

### Windows Build Next Steps
- Transfer project to Windows machine or WSL2 with Windows access
- Follow [windows_build_guide.md](windows_build_guide.md) instructions
- Install Visual Studio Build Tools + Rust + Node.js on Windows
- Run `npm run tauri build` to generate `.msi` installer

### Known Blockers
1. **Audio implementation:** Requires Web Audio API + Opus WASM + UDP bridge
2. **UDP address tracking:** Server can't send UDP packets to clients yet
3. **Windows builds:** Only possible from Windows OS (not Linux/WSL)

### Technical Debt
- No rate limiting enforcement (structure exists)
- No call history tracking (table exists, unused)
- Message pagination (loads all messages)
- No user list per channel UI

---

*Last updated: 2026-02-21 (reflecting actual implementation state)*
