# Changelog

All notable changes and completed tasks are documented here.

## 2026-02-21

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

*Last updated: 2026-02-21*
