# Release Notes - Nexum v0.1.0 (MVP/Alpha)

**Release Date:** February 23, 2026  
**Type:** MVP/Alpha - First Public Release  
**Tag:** `v0.1.0`

---

## 🎉 First Public Release

Welcome to Nexum v0.1.0, the first public release of our self-hosted voice and chat communication platform. This MVP/Alpha release includes all core features required for basic voice and text communication.

## 📦 Download Links

### Client Application
- **Windows MSI Installer** (Recommended)
  - File: `Nexum_0.1.0_x64_en-US.msi`
  - Size: 6.12 MB
  - Location: `client/src-tauri/target/release/bundle/msi/`

- **Windows NSIS Installer**
  - File: `Nexum_0.1.0_x64-setup.exe`
  - Size: 4.05 MB
  - Location: `client/src-tauri/target/release/bundle/nsis/`

- **Standalone Executable**
  - File: `voice-client.exe`
  - Size: 10.68 MB
  - Location: `client/src-tauri/target/release/`

### Server Application
- **Server Executable**
  - File: `voice-server.exe`
  - Size: 7.2 MB
  - Location: `server/target/release/`

---

## ✨ Features

### 🎯 Core Features
- **Self-hosted Architecture** - Complete control over your data
- **Voice & Text Channels** - Organize communications by topic
- **User Authentication** - Secure username-based sessions
- **Avatar System** - Custom user avatars (file upload or URL)
- **Channel Management** - Create, rename, and delete channels
- **Real-time Messaging** - WebSocket-based instant messaging

### 🎨 User Interface
- **Modern Dark Theme** - Professional, consistent design system
- **Button Component Library** - 9 specialized button variants
- **Custom App Icons** - Professional headphones icon design
- **Responsive Layout** - Server list, channels, chat area, user list
- **User Settings Panel** - Avatar management and preferences

### 🔧 Administration
- **Admin Authentication** - Password-protected admin actions
- **Server Settings** - Configurable server parameters
- **User Management** - View all registered users
- **Channel Controls** - Owner-based channel management
- **Password Management** - Change admin password securely

### 💻 Local Server Management
- **Server Detection** - Automatic local server discovery
- **One-Click Start/Stop** - Easy server control
- **First-Time Setup** - Guided admin password configuration
- **Status Monitoring** - Real-time server health checks
- **Port Configuration** - WebSocket (8080) and UDP ports

---

## 🏗️ Technical Stack

### Client
- **Framework:** Tauri 2.0 (Rust + Web)
- **UI Library:** React 18 + TypeScript
- **Styling:** Tailwind CSS with custom theme system
- **Build Tool:** Vite
- **Communication:** WebSocket for real-time updates

### Server
- **Language:** Rust
- **Runtime:** Tokio (async)
- **Web Framework:** Axum 0.7
- **WebSocket:** tokio-tungstenite
- **Database:** SQLite (rusqlite)
- **Image Processing:** webp + image crates

---

## 🚀 Getting Started

### Quick Start (Client Only)

1. **Install the client:**
   ```powershell
   # Run the MSI installer
   .\Nexum_0.1.0_x64_en-US.msi
   ```

2. **Connect to a server:**
   - Enter username
   - Enter server address (e.g., `localhost:8080`)
   - Click "Connect"

### Full Setup (Client + Local Server)

1. **Install the client** (includes server binary)
   
2. **Launch Nexum** and use the Local Server Panel:
   - Set admin password (first time only)
   - Click "Start Server"
   - Connect to `localhost:8080`

### Server-Only Deployment

1. **Copy the server binary:**
   ```powershell
   voice-server.exe
   ```

2. **Run the server:**
   ```powershell
   .\voice-server.exe
   ```

3. **Configure in `server.toml`:**
   ```toml
   server_name = "My Nexum Server"
   max_users = 100
   ws_port = 8080
   udp_port = 8081
   ```

---

## 📋 System Requirements

### Client
- **OS:** Windows 10/11 (64-bit)
- **RAM:** 2 GB minimum, 4 GB recommended
- **Storage:** 50 MB for installation
- **Network:** Internet connection for remote servers

### Server
- **OS:** Windows 10/11, Linux (via Wine or native build)
- **RAM:** 512 MB minimum, 1 GB recommended
- **Storage:** 100 MB (includes database)
- **Network:** Open ports 8080 (WebSocket) and 8081 (UDP)

---

## 🐛 Known Issues

### Voice Functionality
⚠️ **Voice chat is not yet implemented.** This release includes:
- Voice channel creation and management
- UI for joining voice channels
- Placeholder for future voice implementation

### Current Limitations
- No voice audio streaming (UDP implementation pending)
- No encryption for WebSocket communication
- SQLite database (single-file, not distributed)
- Windows-only installers (cross-platform support planned)

---

## 🔒 Security Notice

**Important:** This is an MVP/Alpha release. For production use:
- Use HTTPS/WSS with proper certificates
- Configure firewall rules for exposed ports
- Regularly backup the SQLite database
- Use strong admin passwords
- Keep the server behind a VPN if possible

---

## 📖 Documentation

Complete documentation available in the `/docs` folder:
- **[Quick Start Guide](docs/quickstart.md)** - Get started in 5 minutes
- **[Architecture Spec](docs/architecture_spec.md)** - Technical architecture
- **[Changelog](docs/changelog.md)** - Complete change history
- **[TODO List](docs/todo.md)** - Roadmap and planned features

---

## 🗺️ Roadmap

### v0.2.0 (Planned)
- ✅ Voice audio implementation (UDP streaming)
- 🔒 WebSocket encryption (WSS)
- 🌐 Web client support
- 📱 Mobile app (Android/iOS)
- 🎨 Light theme support

### Future Releases
- End-to-end encryption
- File sharing
- Screen sharing
- Voice recording
- Message history
- User roles and permissions
- Channel permissions

---

## 🤝 Contributing

This is currently a private project. Contributions will be accepted once the repository is made public.

---

## 📝 License

Copyright © 2026 Nexum Team. All rights reserved.

---

## 💬 Support

For issues, questions, or feedback:
- **GitHub Issues:** [Create an issue](https://github.com/hectoresen/nexum_mvp/issues)
- **Documentation:** Check `/docs` folder in repository

---

## 🙏 Acknowledgments

Built with:
- [Tauri](https://tauri.app/) - Desktop app framework
- [Rust](https://www.rust-lang.org/) - System programming language
- [React](https://react.dev/) - UI library
- [Axum](https://github.com/tokio-rs/axum) - Web framework
- [SQLite](https://www.sqlite.org/) - Database engine

---

**Thank you for trying Nexum v0.1.0!** 🎉

We're excited to bring you this first release and look forward to your feedback as we continue developing the platform.
