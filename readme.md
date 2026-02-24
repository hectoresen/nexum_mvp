# Nexum

**Truly private, self-hosted voice and text communication**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust](https://img.shields.io/badge/rust-1.75+-orange.svg)](https://www.rust-lang.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Tauri](https://img.shields.io/badge/tauri-2.0-blue.svg)](https://tauri.app/)
[![Release](https://img.shields.io/badge/version-0.1.0-brightgreen.svg)](https://github.com/yourusername/nexum/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)](https://github.com/yourusername/nexum)

---

## 🎯 What is Nexum?

Nexum is a **lightweight, self-hosted communication platform** that gives you complete control over your conversations. Think Discord or TeamSpeak, but without corporate servers, data collection, or vendor lock-in.

**Your server, your data, your rules.**

### Why Nexum?

In a world where most communication tools route everything through corporate servers, Nexum takes a different path:

🔐 **True Privacy First**

- No central servers storing your messages
- No data collection or analytics
- Your conversations stay on your hardware
- Perfect for privacy-conscious individuals and organizations

🌐 **Fully Decentralized**

- Each server operates independently
- No dependency on external infrastructure
- Works on your LAN, VPS, or Raspberry Pi
- No single point of failure

👤 **Zero Accounts, Maximum Freedom**

- No email verification
- No phone numbers
- No mandatory registration
- Just pick a username and connect

🪶 **Lightweight & Efficient**

- Server runs on <100MB RAM
- Minimal CPU usage at idle
- SQLite-based (no database server needed)
- Optimized Rust backend

🎨 **Modern & Clean Interface**

- Native desktop app (Windows, macOS, Linux)
- Dark mode UI built with Tauri 2.0
- Intuitive channel-based organization
- Built-in server management

🔓 **Truly Open Source**

- Full source code available
- No proprietary components
- Audit-friendly codebase
- Community-driven development

---

## 🚀 Quick Start

Get up and running in minutes:

```powershell
# 1. Start the server
cd server
cargo run --release

# 2. Launch the client (new terminal)
cd client
npm run tauri dev
```

**First connection:**

1. Click "+" to add a server
2. Enter address: `localhost:8080` or your server's IP
3. Connect with any username
4. Create channels and start communicating!

📖 **Detailed setup guide:** [docs/quickstart.md](docs/quickstart.md)

---

## ✨ Features

### Ready Now

✅ **Real-time text chat** with SQLite persistence  
✅ **Channel system** (text and voice types)  
✅ **Role-based permissions** (owner/member)  
✅ **Multi-user support** (up to 200 configurable users)  
✅ **Auto-reconnection** with exponential backoff  
✅ **Avatar system** with file upload & URL support  
✅ **Server management** from client UI  
✅ **Local server management** — start/stop, reset admin password, wipe data, all from client  
✅ **Dark & light themes** with persistent preference  
✅ **Cross-platform** desktop builds

### In Development

🚧 **Voice chat** audio implementation (UI ready)  
🚧 **Unified installer** (client + server bundled)

### Planned

📋 Private messaging (DMs)  
📋 End-to-end encryption for DMs  
📋 Push-to-talk & voice activation  
📋 Message search & history pagination  
📋 TLS support

---

## 🏗️ Architecture Highlights

Nexum is built on a carefully designed architecture that prioritizes **performance, privacy, and simplicity**:

### Dual-Channel Communication

- **WebSocket** for text, control, and signaling (JSON over WS)
- **UDP** for voice packets (Opus-encoded, server-relayed)

### Efficient Data Model

- **SQLite** for persistent storage (users, channels, messages)
- **In-memory sessions** for active connections
- No external databases or caching layers needed

### Technology Stack

**Server (Rust):**

- Tokio for async runtime
- Axum for WebSocket handling
- SQLite for persistence
- ~5MB binary, <100MB RAM usage

**Client (Tauri + React):**

- Cross-platform native app
- React 18 + TypeScript
- Tailwind CSS for modern UI
- Can manage local server instances

📐 **Full technical specifications:** [docs/architecture_spec.md](docs/architecture_spec.md)

---

## 🔒 Privacy & Security

### How We Protect Your Privacy

**No Central Infrastructure**

- Your server doesn't phone home
- No telemetry or crash reports
- No update checks (unless you opt in)
- Zero external dependencies at runtime

**Data Ownership**

- All data stored locally on your server
- You control retention policies
- Delete the database = data is gone forever
- No backups unless you create them

**Identity Model**

- Server-scoped identities (no global accounts)
- Username-based (no email/phone required)
- Optional admin password for server management
- No tracking between servers

**Network Privacy**

- Direct peer-to-server connections
- No traffic routing through external services
- Voice packets relayed (not recorded)
- SQLite database stays on disk

### Production Deployments

For internet-facing servers, we recommend:

- Place behind a reverse proxy (nginx, Caddy)
- Enable TLS/SSL at the proxy level
- Use firewall rules to restrict access
- Regular SQLite backups
- Strong admin passwords

🔐 **Security best practices:** [docs/architecture_spec.md#security](docs/architecture_spec.md)

---

## 🎮 Use Cases

Nexum is perfect for:

**Gaming Communities**

- Coordinate with teammates without Discord's data collection
- Host your own server on a VPS or home PC
- No user limits or nitro subscriptions

**Remote Teams**

- Company-controlled communication
- No third-party access to conversations
- Compliant with strict data policies

**Privacy-Conscious Users**

- No corporate surveillance
- Full audit trail of your data
- Run on airgapped networks if needed

**Educational Projects**

- Learn Rust, WebSockets, and real-time systems
- Study decentralized architecture
- Contribute to open source

**Self-Hosting Enthusiasts**

- Add to your homelab
- Run on Raspberry Pi or NAS
- Complete control over your stack

---

## 📦 Current Status

**Version:** 0.5 (MVP Complete - Text Chat)  
**Release:** Beta / Active Development

| Component             | Status                          |
| --------------------- | ------------------------------- |
| Text Chat             | ✅ Production-ready             |
| User Management       | ✅ Fully functional             |
| Channel System        | ✅ Create, rename, delete       |
| Avatar System         | ✅ Upload & URL support         |
| Server Settings       | ✅ Editable from UI             |
| Local Server Mgmt     | ✅ Start/Stop/Reset/Wipe        |
| Dark & Light Themes   | ✅ Persistent preference        |
| Desktop Client        | ✅ Windows/macOS/Linux          |
| Voice Chat            | 🚧 UI ready, audio pending      |
| Mobile Apps           | 📋 Future consideration         |

**Latest builds:** Check [Releases](../../releases) (coming soon)

---

## 🤝 Contributing

Nexum is open source and welcomes contributions!

### Ways to Help

🎤 **Voice Implementation** - Help implement Web Audio API for voice chat  
🧪 **Testing** - Write unit and integration tests  
🎨 **UI/UX** - Improve the interface and user experience  
📚 **Documentation** - Improve guides and tutorials  
🌍 **Translations** - Add support for more languages  
🐛 **Bug Reports** - Found an issue? Let us know!

### Development Resources

- 📖 [Quick Start Guide](docs/quickstart.md) - Build and run from source
- 🏗️ [Architecture Spec](docs/architecture_spec.md) - Technical deep-dive
- ✅ [Definition of Done](docs/definition_of_done.md) - Contribution workflow
- 📋 [TODO List](docs/todo.md) - Current tasks and roadmap
- 📜 [Changelog](docs/changelog.md) - Development history
- 💡 [Agent Decisions](docs/agent_decisions.md) - Technical decision log

---

## 📚 Documentation

| Document                                                       | Description                   |
| -------------------------------------------------------------- | ----------------------------- |
| [Quick Start](docs/quickstart.md)                              | Build, run, and deploy        |
| [Architecture Spec](docs/architecture_spec.md)                 | Technical architecture        |
| [User Flow](docs/USER_FLOW.md)                                 | User journey and interactions |
| [Client-Server Integration](docs/CLIENT_SERVER_INTEGRATION.md) | Integration design            |
| [TODO](docs/todo.md)                                           | Current tasks and roadmap     |
| [Changelog](docs/changelog.md)                                 | Development history           |
| [Definition of Done](docs/definition_of_done.md)               | Contribution standards        |
| [Agent Decisions](docs/agent_decisions.md)                     | Technical decisions log       |

---

## 🙋 FAQ

**Q: Is Nexum really free?**  
A: Yes! Open source and free forever. Run as many servers as you want.

**Q: Do I need to create an account?**  
A: No accounts needed. Just pick a username when connecting to a server.

**Q: Where is my data stored?**  
A: Locally on the server machine. When the server is launched from the client it stores all data at `~/.nexum/server/` (`server.toml` for config, `data/server.db` for the database). You have full control — the client lets you reset the admin password or wipe all data directly from the UI.

**Q: Can I use this for my team/community?**  
A: Absolutely! That's exactly what it's designed for.

**Q: Is voice chat working?**  
A: Text chat works perfectly. Voice UI is ready but audio implementation is pending.

**Q: How does it compare to Discord?**  
A: Similar UX, but fully self-hosted with no corporate servers or data collection.

**Q: What about end-to-end encryption?**  
A: Planned for private messages. Server uses TLS via reverse proxy for transport security.

**Q: Can I run multiple servers?**  
A: Yes! Each server is independent. The client can connect to multiple servers.

**Q: Is it secure?**  
A: For production, use TLS via reverse proxy. The server validates all input and uses rate limiting.

**Q: What platforms are supported?**  
A: Windows 10+, macOS 12+, and Linux. Both x64 and ARM64 architectures.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**Key Permissions:**

- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use

The MIT License is permissive and allows you to use Nexum for any purpose, including commercial applications, while maintaining minimal restrictions.

---

## 🎉 Get Started

Ready to take control of your communication?

1. **Clone the repo:** `git clone <repo-url>`
2. **Follow the guide:** [docs/quickstart.md](docs/quickstart.md)
3. **Join the community:** (Discord/Matrix link TBD)
4. **Star the project** if you find it useful! ⭐

---

**Built with ❤️ for privacy, freedom, and open source**

_Nexum - Your conversations, your control._
