# Release Notes — Nexum v0.1.4

**Release Date:** February 28, 2026
**Type:** Feature Release + Bug Fixes
**Tag:** `v0.1.4`
**Branch merged:** `develop → main`

---

## 📦 Downloads

### Client Application (Desktop)

- **Nexum_0.1.4_x64_en-US.msi** (~7.1 MB) — Windows MSI installer (recommended)
- **Nexum_0.1.4_x64-setup.exe** (~4.8 MB) — NSIS portable installer

### Server Application (Standalone)

- **Nexum-Server_0.1.4_x64.exe** (~7.3 MB) — Standalone server binary for dedicated hosting

---

## ✨ What's New Since v0.1.3

### 💬 Private Direct Messages — E2E Encrypted (0.5.23)

Users can now send private, end-to-end encrypted one-on-one messages to other server members.

- **AES-GCM 256 encryption** via the Web Crypto API — key derived with PBKDF2(SHA-256, 100k iterations) from sorted user IDs; derived keys cached per conversation. Server stores only opaque ciphertext; no plaintext is ever transmitted.
- **Member list popover**: clicking any other user in the right sidebar opens an inline popover. Sending the first message opens a dedicated conversation view.
- **DM tab bar**: a tab strip at the top of the main content area shows one tab per open conversation with an × close button. Tabs persist until explicitly closed; conversation history survives re-opening.
- **DirectMessageView**: full scrollable conversation with grouped messages, date separators, sender avatars, and a privacy notice banner explaining E2E encryption.
- **Unread badges**: a red dot indicator appears on DM tabs, on the user's row in the member list, and as a pulsing ambient indicator—cleared as soon as the conversation is opened.
- **Tab recovery**: the chat button in the member popover is always visible (not only while a tab is open). Label adapts: "See new message" / "View conversation" / "Open conversation"; clicking with a closed tab re-opens it and fetches history.
- **Server side**: new `direct_messages` SQLite table; `SEND_DM` and `GET_DM_HISTORY` WebSocket message types; server routes DM to recipient if online and persists regardless.

### 🔐 Device-bound ed25519 Cryptographic Identity (0.5.24)

Users now have a stable identity that persists across IP changes and reconnections — without collecting any hardware data.

- **Key generation**: new `get_device_public_key` Tauri command generates a 32-byte ed25519 keypair on first run using a CSPRNG, stores the private key as hex in `~/.nexum/device.key`, and returns the 64-char hex public key. The key is never regenerated unless the file is deleted.
- **Client**: `device_public_key` added to `ConnectPayload`; App invokes the Tauri command on mount and injects the key into every `CONNECT` payload.
- **Server resumption**: `device_public_key TEXT` column (+ unique index) added to `users` table via `ALTER TABLE` migration. On `CONNECT` with a device key and no `resume_session_id`: server resumes the existing user if the key is found, or creates a new user and links the key if not.
- No hardware fingerprinting — the file can be deleted to get a fresh identity. Same trust model as SSH/Git/libp2p.

### 🔑 Pre-launch Admin Password Reset (0.5.18)

The Security tab of the "Start Server" modal now allows resetting the admin password without wiping the server config.

- "Reset Admin Password" button expands an inline form with a password input, Generate button, and "Update Password" action.
- A new `update_server_admin_password` Tauri command replaces only the `admin_password` line in `server.toml` (non-destructive).
- If a new password is entered but not saved before clicking "Launch", it is applied automatically.

### 📋 Pre-launch Config Persistence (0.5.19)

Re-opening the "Start Server" modal on an already-configured server now restores the previously saved name and limits.

- New `read_server_config` Tauri command reads `~/.nexum/server/server.toml` and returns current `name`, `max_users`, `max_users_per_voice_channel`, `max_message_size`, and `is_private`.
- `ServerConfigModal` calls this on mount (pre-launch + isConfigured) and pre-fills all fields.

### 🧙 Standalone Server First-Run Wizard (0.5.20)

The standalone server binary now guides users through full configuration on first launch.

- **Step 1 — Server name**: `dialoguer::Input` prompt with default "My Nexum Server".
- **Step 2 — Admin password**: generate-or-custom choice, confirmation required.
- **Step 3 — Visibility**: Public or Private; if Private, prompts for a join password with confirmation.
- Non-interactive / scripted mode: `--server-name` and `--join-password` CLI args bypass the wizard.
- Confirmation printout shows server name and visibility alongside the admin password.

### 🗂️ Standalone Server Data Path Unification (0.5.21)

The standalone server binary and the embedded (client-managed) server now both use `~/.nexum/server/` for config and data.

- `Config::load()` resolves config to `~/.nexum/server/server.toml` (unless `CONFIG_PATH` env var is set).
- Default `data_path` is `~/.nexum/server/data` (absolute).
- `~/.nexum/server/` is created automatically if it doesn't exist.
- `CONFIG_PATH` env var still overrides for advanced/scripted use.

---

## 🐛 Bug Fixes

| # | Fix |
|---|-----|
| 1 | **NSIS installer "Launch Nexum" checkbox (0.5.22)** — Checking "Launch Nexum" on the final NSIS page had no effect. Fixed by setting `nsis.installMode: "currentUser"` in `tauri.conf.json` (per-user install avoids UAC elevation blocking the post-install launch). |
| 2 | **DM popover clipped by overflow container (0.5.23)** — Clicking a user in the Server Members panel showed no popover because the element was clipped by the `overflow-y-auto` container. Fixed by rendering via `ReactDOM.createPortal` to `document.body` with `position: fixed` coordinates from `getBoundingClientRect()`. |
| 3 | **Username-taken error not shown to user (0.5.23)** — When connecting with an already-used username the server sent `ERROR` before `WELCOME`, but the client had already switched to the connected view. Added `hasReceivedWelcome` guard in `handleConnect` to surface pre-auth errors in the connection modal. |
| 4 | **Server disconnect detection (0.5.16)** — Clients now react immediately when the server goes offline. Yellow "Reconnecting…" banner during 5 retry attempts; navigates back to server list with error modal when all attempts are exhausted. |
| 5 | **Channel deletion not working (0.5.17)** — Delete confirmation clicks were swallowed by the `draggable` parent attribute. Fixed with `draggable={false}` while delete UI is active and `e.stopPropagation()` on confirm/cancel. Server now also cleans up messages before deleting the channel to prevent FK violations. |

---

## 🔧 Technical Changes

### Protocol Extensions

```
ConnectPayload        → device_public_key?: string  (new optional field)
ConnectPayload        → join_password?: string       (since 0.5.13)
SERVER_SETTINGS       → is_private: bool             (since 0.5.13)
DM_RECEIVED           → (new message type)
SEND_DM               → (new message type)
GET_DM_HISTORY        → (new message type)
```

### Database Migrations

```sql
-- v0.5.23
CREATE TABLE direct_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  encrypted_content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- v0.5.24
ALTER TABLE users ADD COLUMN device_public_key TEXT;
CREATE UNIQUE INDEX idx_users_device_key ON users(device_public_key) WHERE device_public_key IS NOT NULL;
```

### New Tauri Commands

```
get_device_public_key() → String
update_server_admin_password(password: String)
read_server_config() → ServerConfigValues
```

### New / Modified Files

| File | Change |
|------|--------|
| `client/src-tauri/Cargo.toml` | Added `ed25519-dalek = "2"`, `rand = "0.8"`, `hex = "0.4"` |
| `client/src-tauri/src/main.rs` | `get_device_public_key`, `update_server_admin_password`, `read_server_config` commands |
| `client/src-tauri/tauri.conf.json` | `nsis.installMode: "currentUser"`, `shortcutName`, `allowWebviewInstall` |
| `client/src/types/protocol.ts` | `device_public_key?` in `ConnectPayload`; DM message types |
| `client/src/App.tsx` | Device key init on mount; DM state (`dmMessages`, `openDmTabs`, unread badges); `hasReceivedWelcome` guard |
| `client/src/components/MainView.tsx` | DM tab bar, unread dot badges, reconnecting banner |
| `client/src/components/UserListPanel.tsx` | Portal-based popover; always-visible chat button; unread pulsing indicator |
| `client/src/lib/dmCrypto.ts` | **New** — AES-GCM 256 + PBKDF2 key derivation with module-level cache |
| `client/src/components/DirectMessageView.tsx` | **New** — Full DM conversation view with privacy banner |
| `server/src/models.rs` | `device_public_key: Option<String>` in `ConnectPayload`; DM models |
| `server/src/db.rs` | `direct_messages` table; `device_public_key` column + unique index; `get_user_by_device_key`, `link_device_key` |
| `server/src/handlers.rs` | Device-key-based user resume/creation; DM send + history handlers |
| `server/src/config.rs` | Standalone server first-run wizard steps; `--server-name` / `--join-password` CLI args; `~/.nexum/server/` path unification |
| `server/src/main.rs` | Wizard orchestration; confirmation printout |
