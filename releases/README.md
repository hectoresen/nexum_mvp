# Nexum Releases

Official releases of Nexum voice and chat application.

## Latest Release

### [v0.1.0](v0.1.0/) - MVP/Alpha (February 23, 2026)

**Client Downloads:**

- [Windows MSI Installer](v0.1.0/Nexum_0.1.0_x64_en-US.msi) (Recommended - 7.2 MB)
  - Desktop application with integrated server management
  - Start menu integration and auto-updates
- [Windows NSIS Installer](v0.1.0/Nexum_0.1.0_x64-setup.exe) (4.9 MB)
  - Portable installation option

**Server Download (Standalone):**

- [Nexum Server Executable](v0.1.0/Nexum-Server_0.1.0_x64.exe) (7.5 MB)
  - For dedicated hosting or manual deployment
  - No installation required - run directly
  - First run: `Nexum-Server_0.1.0_x64.exe --admin-password <password>`

**[Full Release Notes](v0.1.0/README.md)**

---

## Installation

### For Desktop Users (Recommended)

1. Download `Nexum_0.1.0_x64_en-US.msi`
2. Double-click to install
3. Launch Nexum from Start Menu
4. Server management integrated in client UI
5. Automatic local server detection and startup

### For Server Administrators

**Option A - Managed by Client:**

- Install client MSI/NSIS
- Server binary included and managed by client
- Start/stop through client UI

**Option B - Standalone Server:**

1. Download `Nexum-Server_0.1.0_x64.exe`
2. Place in any directory (e.g., `C:\Nexum\`)
3. First run: `Nexum-Server_0.1.0_x64.exe --admin-password YourSecurePassword123`
4. Subsequent runs: `Nexum-Server_0.1.0_x64.exe`
5. Configure as Windows Service for auto-start (optional)

See [Server Deployment Guide](../docs/server_deployment.md) for advanced setup.

---

## System Requirements

- **OS:** Windows 10/11 (64-bit)
- **RAM:** 2 GB minimum, 4 GB recommended
- **Storage:** 50 MB for client, 100 MB for server (includes database)
- **Network:**
  - Port 8080 (WebSocket) - required
  - Port 8081 (UDP) - for voice channels
  - For internet access: Configure port forwarding on router

---

## What's Included

- **Client Application:**
  - Modern desktop UI with light/dark themes
  - Integrated server management
  - Real-time voice and text chat
  - Avatar system (upload or URL)
  - Channel management

- **Server Application:**
  - Self-hosted Rust backend
  - SQLite database (no setup required)
  - WebSocket + UDP communication
  - Admin authentication
  - User and channel management

---

## Support

- **Documentation:** [/docs](../docs/)
- **Issues:** [GitHub Issues](https://github.com/hectoresen/nexum_mvp/issues)
- **Repository:** [github.com/hectoresen/nexum_mvp](https://github.com/hectoresen/nexum_mvp)
- **License:** [MIT License](../LICENSE)
