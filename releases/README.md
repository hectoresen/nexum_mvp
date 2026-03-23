# Nexum Releases

This folder contains official production releases of Nexum.

## 📋 Structure

Each version has its own folder containing:

```
releases/
├── README.md                    # This file (general info)
├── v0.1.0/                      # Version folder
│   ├── README.md                # Release notes
│   ├── Nexum_0.1.0_x64_en-US.msi
│   ├── Nexum_0.1.0_x64-setup.exe
│   └── Nexum-Server_0.1.0_x64.exe
├── v0.1.2/
├── v0.1.3/
├── v0.1.4/
└── v0.1.5/                      # Latest
    ├── README.md
    ├── Nexum_0.1.5_x64_en-US.msi
    ├── Nexum_0.1.5_x64-setup.exe
    └── Nexum-Server_0.1.5_x64.exe
```

## 🚀 Latest Release

**[v0.1.5 — Bug Fix Release](v0.1.5/)** (March 22, 2026)

- Online presence now accurate for all users
- Taskbar badge is now a circle (not a square) — fixed via `CreateDIBSection` 32bpp DIB per-pixel alpha
- Avatar upload/display fixed for non-host clients (Chrome PNA)
- Admin message deletion, muted-user input guard, DM loading fixes
- See [v0.1.5 Release Notes](v0.1.5/README.md) for details

---

### Previous Releases

| Version | Date | Type |
|---------|------|------|
| [v0.1.4](v0.1.4/) | Feb 28, 2026 | Feature + Bug Fixes |
| [v0.1.3](v0.1.3/) | Feb 27, 2026 | Feature Release |
| [v0.1.2](v0.1.2/) | Feb 25, 2026 | Feature Release |
| [v0.1.0](v0.1.0/) | Feb 22, 2026 | MVP / Alpha |

---

## 📦 Installation Guide

### Desktop Users (Recommended)

**Download the client installer from the version folder:**

1. Navigate to the latest version folder (e.g., `v0.1.0/`)
2. Download `Nexum_X.X.X_x64_en-US.msi` (Windows MSI installer)
3. Double-click to install
4. Launch from Start Menu
5. Server is included and managed automatically

### Server Administrators

**For dedicated hosting or manual deployment:**

1. Download `Nexum-Server_X.X.X_x64.exe` from version folder
2. Place in any directory
3. First run: `Nexum-Server_X.X.X_x64.exe --admin-password <YourPassword>`
4. Subsequent runs: `Nexum-Server_X.X.X_x64.exe`
5. Optional: Configure as Windows Service

See [Server Deployment Guide](../docs/server_deployment.md) for advanced setup.

---

## 💻 System Requirements

- **OS:** Windows 10/11 (64-bit)
- **RAM:** 2 GB minimum, 4 GB recommended
- **Storage:** 50 MB for client, 100 MB for server
- **Network:** Ports 8080 (WebSocket) and 8081 (UDP)

---

## 📚 Resources

- **Documentation:** [/docs](../docs/)
- **Issues:** [GitHub Issues](https://github.com/hectoresen/nexum_mvp/issues)
- **Repository:** [github.com/hectoresen/nexum_mvp](https://github.com/hectoresen/nexum_mvp)
- **License:** [MIT License](../LICENSE)

---

## 🔖 Version History

| Version           | Date       | Type             | Notes                                            |
| ----------------- | ---------- | ---------------- | ------------------------------------------------ |
| [v0.1.5](v0.1.5/) | 2026-03-22 | Bug Fix Release  | Presence fix, taskbar badge, avatar PNA fix      |
| [v0.1.4](v0.1.4/) | 2026-02-28 | Feature + Fixes  | E2E DMs, ed25519 identity, standalone wizard     |
| [v0.1.3](v0.1.3/) | 2026-02-27 | Feature Release  | Private servers, unified config modal, auto-start|
| [v0.1.2](v0.1.2/) | 2026-02-25 | Feature Release  | Avatars, channel rename/delete, dark mode        |
| [v0.1.0](v0.1.0/) | 2026-02-22 | MVP / Alpha      | First public release                             |
