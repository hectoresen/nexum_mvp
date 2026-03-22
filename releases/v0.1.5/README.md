# Release Notes — Nexum v0.1.5

**Release Date:** March 22, 2026
**Type:** Bug Fix Release
**Tag:** `v0.1.5`
**Branch merged:** `feature/0.5.14-notifications → develop → main`

---

## 📦 Downloads

### Client Application (Desktop)

- **Nexum_0.1.5_x64_en-US.msi** (~7.4 MB) — Windows MSI installer (recommended)
- **Nexum_0.1.5_x64-setup.exe** (~5.0 MB) — NSIS portable installer

### Server Application (Standalone)

- **Nexum-Server_0.1.5_x64.exe** (~7.5 MB) — Standalone server binary for dedicated hosting

---

## 🐛 Bug Fixes

### 🌐 Online Presence — User Status Now Accurate

**Problem:** The member list always showed all users as offline (grey dot) and the "X online · Y total" counter always read "0 online". Server owners appeared as offline in their own server. Clients connected at different times could not see each other's online status.

**Root cause:** The server binary embedded in the previous installer (`v0.1.4`) was stale — it predated all online-presence fixes. `npm run tauri build` alone does not recompile the server; the `voice-server.exe` resource must be rebuilt separately and copied before bundling. This release establishes a correct build pipeline.

**Fix:** Server binary rebuilt from source (`cargo build --release`) with all presence fixes in place, then re-embedded in the installer. Online status is now broadcast correctly on connect and disconnect.

---

### 🟠 Taskbar Notification Badge — Now a Circle

**Problem:** The unread-count badge overlaid on the taskbar icon appeared as a solid red/orange square instead of a circle.

**Root cause:** `CreateBitmap` (DDB, 32bpp) ignores the separate 1bpp AND mask on modern Windows (WebView2). The mask is simply not applied — the result is always rectangular.

**Fix:** Replaced `CreateBitmap` with `CreateDIBSection` (DIB, 32bpp BGRA) using per-pixel alpha: circle pixels (`#FF8C00`, alpha 255) with transparent exterior (alpha 0). The badge is now a clean orange circle regardless of Windows version.

---

### 🖼️ Avatar System — Remote Clients Fixed

**Problem (1 of 2):** Non-host users received a **"Failed to fetch"** error when uploading a profile picture while connected to someone else's server. The avatar was never saved.

**Problem (2 of 2):** Profile pictures uploaded by any user appeared as **broken images** for clients on other machines.

**Root cause:** The Tauri WebView runs under the `tauri://localhost` origin. Chromium's [Private Network Access](https://wicg.github.io/private-network-access/) (PNA) policy blocks `fetch()` requests from `tauri://localhost` to private IPs (`192.168.x.x`, `10.x.x.x`) unless the server includes `Access-Control-Allow-Private-Network: true` in CORS preflight responses. WebSocket upgrade requests bypass PNA (no preflight), which is why the main connection worked fine while HTTP avatar endpoints were silently blocked.

**Fix:**
- `.allow_private_network(true)` added to the `tower-http` `CorsLayer` in the server (`server/src/websocket.rs`).
- `AvatarModal` now sends the relative path (`avatars/uuid.webp`) instead of the absolute `localhost` URL, so all clients resolve it against their own server address.
- Tauri `tauri.conf.json` CSP updated to explicitly allow `img-src http:` for local-network HTTP servers.
- All avatar URL constructions now append `?v=${avatar_version}` to bust the browser cache on upload.

---

### 💬 Admin Message Deletion — Now Working

**Problem:** Server admins (owners) could not delete messages sent by other users. The delete button only appeared on the admin's own messages.

**Root cause:** Same stale binary issue — the fix was already in source but had not been compiled into the embedded server.

**Fix:** Resolved by the server binary rebuild. Owners now see the delete button on all messages; the edit button remains restricted to message authors only.

---

### 👁️ DM Loading — Resolved for Late-Joining Users

**Problem:** When user A was already connected and user B joined, user A's member list was not updated. Opening a DM with the new user caused an infinite loading screen and the tab showed "…" instead of the username.

**Fix:**
- Server now broadcasts `ServerUsers` to all connected clients immediately after sending `WELCOME` to a new user, ensuring existing clients always have an up-to-date member list.
- `MainView` constructs a temporary `User` object from DM message metadata (`sender_username`, `sender_avatar_*`) when the sender is not yet in `serverUsers`, preventing loading states and "…" tab labels.

---

### 🔇 Muted User Input — Enforced in Client

**Problem:** A text-muted user could still type and submit messages from the client side (the server rejected them, but there was no feedback).

**Fix:** `ChatArea` now checks `is_text_muted` and replaces the input form with a red notice ("You are muted") when the user is text-muted.

---

## 🔧 Technical Changes

### Server

- `server/src/websocket.rs` — `CorsLayer` extended with `.allow_private_network(true)`
- `server/src/handlers.rs` — `handle_connect` broadcasts `ServerUsers` to all clients after `WELCOME`
- Server binary version bumped to `0.1.5`

### Client

- `client/src-tauri/src/main.rs` — Taskbar badge rewritten using `CreateDIBSection` (32bpp DIB, per-pixel BGRA alpha)
- `client/src/components/AvatarModal.tsx` — Saves relative `avatar_path` instead of absolute URL
- `client/src/components/UserListPanel.tsx` — Avatar URLs include `?v=` cache-busting; online dot reflects actual `is_online` status; "X online · Y total" counter
- `client/src/components/ChatArea.tsx` — Avatar `?v=` cache-busting; muted-user input guard; owner delete button on all messages
- `client/src/App.tsx` — Avatar `?v=` cache-busting; `UPDATE_AVATAR` skipped for relative paths (HTTP upload already triggered `USER_UPDATED` broadcast)
- `client/src/components/MainView.tsx` — Temporary user fallback for unknown DM senders
- `client/src-tauri/tauri.conf.json` — CSP updated with explicit `img-src 'self' data: https: http: blob:`
- Client version bumped to `0.1.5`

---

## ⬆️ Upgrading from v0.1.4

This is a drop-in replacement. No database migrations required. Existing `~/.nexum/server/server.db` and `server.toml` are fully compatible.

1. Uninstall the previous version (or install over it — MSI handles upgrades automatically).
2. Install `Nexum_0.1.5_x64_en-US.msi`.
3. Launch normally.

Server administrators running standalone: replace `Nexum-Server_0.1.4_x64.exe` with `Nexum-Server_0.1.5_x64.exe`.

---

## ⚠️ Known Issues

- Avatar upload and remote avatar display may still fail for non-host users in some network configurations (investigation ongoing — tracked in `docs/todo.md`).
- Kicked users do not receive an explicit "you have been kicked" notification — they are silently disconnected. A notification modal is planned for the next release.
