# Release Notes — Nexum v0.1.3

**Release Date:** February 27, 2026
**Type:** Feature Release + Bug Fixes
**Tag:** `v0.1.3`
**Branch merged:** `develop → main`

---

## 📦 Downloads

### Client Application (Desktop)

- **Nexum_0.1.3_x64_en-US.msi** (~7.1 MB) — Windows MSI installer (recommended)
- **Nexum_0.1.3_x64-setup.exe** (~4.8 MB) — NSIS portable installer

### Server Application (Standalone)

- **Nexum-Server_0.1.3_x64.exe** (~7.3 MB) — Standalone server binary for dedicated hosting

---

## ✨ What's New Since v0.1.2

### 🔒 Server Join Password / Private Servers (0.5.13)

Server owners can now make their server private by requiring a join password.

- New **Private Server** toggle and join password input in the Security tab of the Server Config modal (both pre-launch and manage modes)
- Absent or empty password = open server; set a password = private server
- Clients attempting to join a private server see a **Join Password modal** automatically — wrong password shows an inline error and allows retry
- `CONNECT` payload accepts an optional `join_password` field; server returns `PASSWORD_REQUIRED` when the password is missing or wrong (with different messages distinguishing the two cases)
- `ServerSettingsPayload` now includes `is_private: bool` so the client can display privacy state without the actual password being transmitted
- New `join_password` field in `server.toml` / `ServerConfig` (omitted from file when empty)

### 🖥️ Server Launch UX + Unified Config Modal (0.5.15)

Clicking "Start Server" now opens a full tabbed configuration modal.

- **Pre-launch mode**: General tab (server name + limits), Security tab (admin password on first launch, informational note if already configured), Moderation tab (placeholder for 0.5.12)
- After clicking "Launch Server", the modal transitions to a **spinner / progress step** that polls both process alive and TCP port reachable checks every second, timing out after 30 s with a "Try Again" option
- On success: **"Server is ready!"** confirmation with the WS address and a **"Connect Now →"** button that auto-adds the local server to the list and opens the connect modal
- **Manage mode** (connected as admin → Server Settings): same tabbed layout with live-edit of name/limits/ports (read-only) + Change Admin Password in Security tab
- `ServerSettingsModal.tsx` fully superseded by the unified `ServerConfigModal.tsx`

### 🚀 Auto-Start on Windows Startup (0.5.10)

New toggle in **Client Settings → General** to register/unregister Nexum in the Windows startup registry.

- Reads current auto-start state from `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` on modal open
- Toggle calls `enable_auto_start` (writes exe path to registry) or `disable_auto_start` (removes key)
- Disabled while the operation is in progress to prevent double-clicks
- Windows-only; gracefully no-ops on other platforms

### 🧹 UI Cleanup (0.5.8)

- **Removed redundant "View Users" button** from the admin sidebar — all users can already see the member list in the right panel. `UserListModal.tsx` is preserved for future reuse in the upcoming Moderation System (0.5.12)

### 🐛 Bug Fixes

| #   | Fix                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Server binary detection now auto-scans for any file matching `nexum-server*.exe`, fixing "Not installed" shown with versioned filenames like `Nexum-Server_0.1.2_x64.exe` |

---

## 🔧 Technical Changes

### Protocol Extensions

```
CONNECT payload         → join_password? (optional string)
SERVER_SETTINGS payload → is_private: bool (new field)
ErrorCode               → PASSWORD_REQUIRED (new variant)
```

### New Tauri Commands

```
write_initial_server_config(join_password: String)
check_server_ready() → bool
is_auto_start_enabled() → bool
enable_auto_start()
disable_auto_start()
```

### New / Modified Files

| File | Change |
|------|--------|
| `server/src/config.rs` | Added `join_password: Option<String>` to `ServerConfig` |
| `server/src/models.rs` | `ConnectPayload`, `UpdateServerSettingsPayload` + new `PasswordRequired` error code |
| `server/src/handlers.rs` | Join password validation in `handle_connect`; update in `handle_update_server_settings` |
| `client/src-tauri/src/main.rs` | `write_initial_server_config`, `check_server_ready`, auto-start commands |
| `client/src/types/protocol.ts` | `join_password?`, `is_private`, `PASSWORD_REQUIRED` |
| `client/src/components/ServerConfigModal.tsx` | Security tab with Private Server toggle + password field |
| `client/src/components/JoinPasswordModal.tsx` | **New** — join password prompt shown on `PASSWORD_REQUIRED` |
| `client/src/components/MainView.tsx` | Removed "View Users" button |
| `client/src/App.tsx` | Join password flow, auto-start integration, removed user list modal |
