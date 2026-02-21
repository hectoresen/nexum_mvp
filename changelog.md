# Changelog

All notable changes and completed tasks are documented here.

## 2026-02-21 - Architecture Change: Client-Server Integration

### Strategy Shift

- 🎯 **New focus**: Integrate CLI server with client application
- 🎯 **Unified installation**: Client and server bundled together in single installer
- 🎯 **Local server detection**: Client can detect and launch local server
- 🎯 **Simplified UX**: Non-technical users can run their own server
- 📋 **GUI server postponed**: Advanced GUI management interface moved to later phase

### Planned Features

- 📦 Single `.msi` installer for client + server
- 🔍 Automatic detection of local server installation
- ▶️ Start/stop server control from client UI
- 🔐 Integrated password management
- 🌐 Choice between local server or remote connection
- 🎨 Setup wizard on first launch

### Documentation

- ✅ Created `CLIENT_SERVER_INTEGRATION.md` - Complete integration design
- ✅ Updated todo list with integration tasks
- ✅ Technical specifications for all implementation phases

---

## 2026-02-21 - Secure Admin Password Generation

### Security Improvements

- ✅ **Auto-generated secure passwords**: Server creates random 16-char password on first launch
- ✅ **Prominent password display**: Password shown clearly in console on first run
- ✅ **Automatic config creation**: `server.toml` created automatically with secure password
- ✅ **No default passwords**: Removed hardcoded "admin" default

### Server Changes

- ✅ Added `rand` dependency for secure random generation
- ✅ Implemented `generate_secure_password()` method
- ✅ Modified `Config::load()` to detect first-time setup
- ✅ Auto-save configuration file on first launch
- ✅ Clear console output with password and instructions

### User Experience

- 🎯 **First launch**: Password displayed prominently, saved to `server.toml`
- 🎯 **Easy password recovery**: Delete `server.toml` and restart
- 🎯 **Manual password change**: Edit `server.toml` and restart server
- 🎯 **No data loss**: Deleting config doesn't affect database

### Documentation

- ✅ Created comprehensive `server/README.md`
- ✅ Updated USER_FLOW.md with first-time setup instructions
- ✅ Added password recovery procedures
- ✅ Included security notes and best practices

---

## 2026-02-21 (Earlier)

### Breaking Changes

- ⚠️ **All users now start as `member` by default**
  - Removed first-user-is-owner logic
  - To become owner, users must authenticate with admin password
  - No more automatic owner assignment

### Server Changes

- ✅ Removed `is_first_user()` check from connection handler
- ✅ All new users created with `UserRole::Member`
- ✅ Made `username` optional in `ConnectPayload` (only required for new users)
- ✅ Improved validation: require username only when creating new user

### Client Changes

- ✅ **Auto-reconnect without username**: If userId is saved, connect automatically
- ✅ **Username prompt only for new users**: Modal only appears for first-time connections
- ✅ Added `handleConnectWithUserId()` for seamless reconnection
- ✅ Modified `handleSelectServer()` to check for saved userId
- ✅ Made `username` optional in `ConnectPayload` type

### User Experience Improvements

- 🎯 **Streamlined reconnection**: No username prompt on returning connections
- 🎯 **Consistent role system**: Everyone starts equal, must authenticate for admin
- 🎯 **Better persistence**: Saved userId enables instant reconnection

### Database

- ✅ Methods `count_users()` and `is_first_user()` are now unused (kept for backwards compatibility)

---

## 2026-02-21 (Earlier)

### Server Changes

- ✅ Added `name` and `admin_password` fields to server configuration
- ✅ Implemented `AUTHENTICATE_ADMIN` protocol message
- ✅ Added admin authentication handler with password verification
- ✅ Added `update_user_role()` method to Database
- ✅ Added `update_user_role()` method to SessionManager
- ✅ Added `ADMIN_AUTHENTICATED` response message
- ✅ Updated ErrorCode enum to include `InvalidRequest`
- ✅ Updated server.example.toml with new configuration options

### Client Changes

- ✅ Added `AUTHENTICATE_ADMIN` message type to protocol
- ✅ Added `ADMIN_AUTHENTICATED` response handler
- ✅ Created AdminAuthModal component for password input
- ✅ Created ServerSettingsModal component for server configuration
- ✅ Added "Authenticate as Admin" button for members
- ✅ Added "Server Settings" button for owners
- ✅ Integrated admin authentication flow in App.tsx

### Features

- **Admin Password System**: Members can authenticate as admin using a password
- **Server Configuration Panel**: Owners can view server configuration (editing coming soon)
- **Role Persistence**: User roles are now properly maintained across reconnections
- **Identity Persistence**: Users reconnect with their existing UUID and role

### Documentation

- ✅ Updated USER_FLOW.md with completed phases
- ✅ Marked Phases 1-3 as completed
- ✅ Updated Estado Actual section with completed features

---

## 2026-02-21 (Earlier)

### Windows Build Success 🎉

- ✅ Successfully compiled Windows installers on native Windows
- ✅ Generated MSI installer (3.47 MB): `Voice MVP_0.1.0_x64_en-US.msi`
- ✅ Generated NSIS installer (2.32 MB): `Voice MVP_0.1.0_x64-setup.exe`
- ✅ Installed Rust toolchain 1.93.1 with cargo
- ✅ Compiled 470 Rust crates successfully
- ✅ Build completed in ~1m 37s
- ✅ Updated readme.md with download links and build status

### Build Environment

- Platform: Windows (native)
- Node.js: v22.19.0
- Rust: 1.93.1 (stable-x86_64-pc-windows-msvc)
- Cargo: 1.93.1
- Build tool: Tauri 2.10.2
- Frontend: Vite 5.4.21, React 18, TypeScript 5

---

## 2026-02-21 (Earlier)

### Documentation

- Created `agent_decisions.md` with complete technical decision log
- Created `todo.md` with comprehensive task breakdown and questions
- Created `changelog.md` for tracking progress

### Decisions Made

- Selected Axum over Actix for WebSocket server (simpler API)
- Chose rusqlite over diesel/sqlx (lighter for MVP)
- Decided on monorepo structure (server/ + client/ + protocol/)
- Defined UDP packet format: [version:1][sessionId:16][opus_data:variable]
- Set default limits: 200 users/server, 100 users/voice channel
- Decided against TLS in MVP (reverse proxy recommended)
- Chose manual schema migrations over ORM migrations

### Server Implementation (✅ Complete)

- Created Cargo.toml with all dependencies (tokio, axum, rusqlite, serde, etc.)
- Implemented main.rs with server initialization and startup
- Created config.rs with TOML-based configuration and defaults
- Implemented models.rs with all protocol types and database models
- Created db.rs with SQLite operations (users, channels, messages)
- Implemented session.rs for in-memory session and channel management
- Created websocket.rs with Axum WebSocket server
- Implemented udp.rs for voice packet forwarding (structure complete, UDP address tracking TODO)
- Created handlers.rs with all message handlers (CONNECT, CREATE_CHANNEL, SEND_MESSAGE, etc.)
- Added .gitignore for server

### Client Implementation (✅ Complete - MVP UI)

- Created package.json with React 18, TypeScript 5, Tauri 2, Tailwind CSS
- Set up Tauri configuration (tauri.conf.json)
- Created Tauri backend (src-tauri/Cargo.toml, main.rs)
- Implemented protocol types (src/types/protocol.ts) matching server
- Created WebSocket client (src/lib/websocket.ts) with auto-reconnect
- Implemented main App component with state management
- Created ConnectView component (username + server address input)
- Created MainView component (sidebar + chat area layout)
- Implemented ChannelList component with text/voice channel display
- Created ChatArea component with message display and input
- Added Tailwind CSS styling with dark theme
- Added .gitignore for client

### Documentation & Tooling

- Created readme.md with project overview (merged from README.md + SETUP_COMPLETE.md)
- Created quickstart.md with setup instructions
- Created definition_of_done.md with task validation workflow
- Created dev.sh helper script with common commands (made executable)
- Added global .gitignore for workspace
- Renamed all .md files to lowercase for consistency
- Moved original spec from readme.md to architecture_spec.md

### File Standardization (2026-02-21 - Latest)

- ✅ Merged README.md + SETUP_COMPLETE.md → readme.md
- ✅ Renamed all .md files to lowercase:
  - readme.md (original spec) → architecture_spec.md
  - README.md → readme.md (merged)
  - QUICKSTART.md → quickstart.md
  - DEFINITION_OF_DONE.md → definition_of_done.md
- ✅ Updated all internal references to use lowercase names
- ✅ Removed duplicate files (README.md, SETUP_COMPLETE.md)

### Notes

- Voice chat UI present but not functional (requires audio implementation)
- UDP voice forwarding needs UDP address tracking per session
- Server compiles but not yet tested
- Client should compile and connect to server

### File Count Summary

- **Server:** 10 files (Cargo.toml, 8 Rust source files, .gitignore)
- **Client:** 19 files (config files, Tauri backend, React components, types, lib)
- **Documentation:** 7 files (readme, quickstart, architecture_spec, agent_decisions, todo, changelog, definition_of_done)
- **Total:** 37+ files created

---

_Last updated: 2026-02-21_
