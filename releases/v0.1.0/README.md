# Release Notes - Nexum v0.1.0 (MVP/Alpha)

**Release Date:** February 23, 2026  
**Type:** MVP/Alpha - First Public Release  
**Tag:** `v0.1.0`

---

## 🎉 First Public Release

Welcome to Nexum v0.1.0, the first public release of our self-hosted voice and chat communication platform. This MVP/Alpha release includes all core features required for basic text communication and the foundation for voice features.

---

## 📦 Downloads

### Client Application (Desktop)

- **Nexum_0.1.0_x64_en-US.msi** (~7.2 MB)
  - Windows MSI installer (recommended)
  - Start menu integration
  - Includes server binary

- **Nexum_0.1.0_x64-setup.exe** (~4.9 MB)
  - NSIS installer (portable option)

### Server Application (Standalone)

- **Nexum-Server_0.1.0_x64.exe** (~7.5 MB)
  - Standalone server executable
  - For dedicated hosting

**Checksums:** (calculate after final build)

---

## ✨ Features Implemented

### 🎯 Core Features

- ✅ **Self-hosted Architecture** - Complete control over your data
- ✅ **Text Channels** - Real-time messaging via WebSocket
- ✅ **Voice Channels** - Channel structure (audio streaming pending)
- ✅ **User Authentication** - Username-based sessions with persistence
- ✅ **Avatar System** - Upload images or use external URLs
- ✅ **Channel Management** - Create, rename, and delete channels (owner only)
- ✅ **Real-time Sync** - All actions broadcast instantly to connected users

### 🎨 User Interface

- ✅ **Modern Dark Theme** - Clean, professional design
- ✅ **Button Component Library** - 9 specialized button variants
- ✅ **Custom App Icons** - Professional headphones icon
- ✅ **Responsive Layout** - Server list, channels, chat, user list
- ✅ **User Settings Panel** - Avatar management and preferences
- ✅ **Server Management UI** - Local server control from client

### 🔧 Administration

- ✅ **Admin Authentication** - Password-protected admin actions
- ✅ **Server Settings** - Configure name, limits, ports
- ✅ **User Management** - View all registered users
- ✅ **Channel Controls** - Owner-based permissions
- ✅ **Password Management** - Change admin password securely

### 💻 Local Server Management

- ✅ **Server Detection** - Automatic local server discovery
- ✅ **One-Click Start/Stop** - Easy server control
- ✅ **First-Time Setup** - Guided admin password configuration
- ✅ **Status Monitoring** - Real-time health checks
- ✅ **Port Configuration** - WebSocket (8080) and UDP (8081)

---

## 🏗️ Technical Stack

### Client

- **Framework:** Tauri 2.0 (Rust + Web)
- **UI Library:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Build:** Vite
- **Communication:** WebSocket

### Server

- **Language:** Rust
- **Runtime:** Tokio (async)
- **Web Framework:** Axum 0.7
- **WebSocket:** tokio-tungstenite
- **Database:** SQLite (rusqlite)
- **Image Processing:** webp + image crates

---

## 🐛 Known Issues & Limitations

### Voice Functionality

⚠️ **Voice audio is not yet implemented.** This release includes:

- Voice channel UI and structure
- Join/leave voice channels
- Voice channel indicators
- UDP socket placeholder

**What's missing:**

- Audio capture and playback
- Audio codec implementation
- UDP audio streaming
- Voice connection management

### Other Limitations

- No WebSocket encryption (plain WS, not WSS)
- Single-server only (no federation)
- Windows-only installers
- No message editing or deletion
- No file attachments
- No notification system

---

## 🔒 Security Notice

**This is an MVP/Alpha release.** For production use:

- ⚠️ WebSocket traffic is NOT encrypted
- ⚠️ Use behind a VPN or private network
- ✅ Admin password is required
- ✅ Sessions persist with secure IDs
- 🔜 WSS encryption planned for v0.2.0

**Recommendations:**

- Use strong admin passwords
- Keep server behind firewall
- Backup SQLite database regularly
- Don't expose to public internet without VPN

---

## 📝 Upgrade Notes

**First-time installation:** No upgrade considerations.

**Database:** SQLite database created on first run at:

- Windows: `%APPDATA%/Nexum/data/nexum.db`
- Manual config: See `server.toml`

---

## 🗺️ What's Next

### Planned for v0.2.0

- 🎤 Voice audio implementation (UDP streaming)
- 🔒 WebSocket encryption (WSS)
- 🎨 Light theme support
- 💬 Message editing and deletion
- 📎 File attachments

### Future Releases

- End-to-end encryption
- Mobile apps (Android/iOS)
- Web client
- Screen sharing
- Message search
- User roles and permissions

---

## 🙏 Credits

Built with:

- [Tauri](https://tauri.app/) - Desktop framework
- [Rust](https://www.rust-lang.org/) - Systems language
- [React](https://react.dev/) - UI library
- [Axum](https://github.com/tokio-rs/axum) - Web framework
- [SQLite](https://www.sqlite.org/) - Database

---

**Thank you for trying Nexum v0.1.0!** 🎉

See [/docs](../../docs/) for complete documentation or the [parent README](../README.md) for installation instructions.
