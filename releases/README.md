# Nexum Releases

This folder contains official production releases of Nexum.

## 📋 Structure

Each version has its own folder containing:

```
releases/
├── README.md                    # This file (general info)
├── v0.1.0/                      # Version folder
│   ├── README.md                # v0.1.0 release notes
│   ├── Nexum_0.1.0_x64_en-US.msi
│   ├── Nexum_0.1.0_x64-setup.exe
│   └── Nexum-Server_0.1.0_x64.exe
└── v0.1.1/                      # Next version...
    └── ...
```

## 🚀 Latest Release

**[v0.1.0 - MVP/Alpha](v0.1.0/)** (February 23, 2026)

- First public release with voice & text chat
- Self-hosted architecture
- Desktop client + standalone server
- See [v0.1.0 Release Notes](v0.1.0/README.md) for details

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

| Version           | Date       | Type      | Notes                |
| ----------------- | ---------- | --------- | -------------------- |
| [v0.1.0](v0.1.0/) | 2026-02-23 | MVP/Alpha | First public release |
