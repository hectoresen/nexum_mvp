# TODO List - Nexum

## 🚧 Phase 0.5: Client-Server Integration (IN PROGRESS)

**Priority: HIGH - Current Focus**

This phase integrates the CLI server with the client for a unified user experience.

### 🔴 CRÍTICO — Identidad de usuario vinculada a hardware (sin recopilar datos)

**Problema:** Los usuarios se persisten en la base de datos del servidor con un `user_id` generado en el primer login, vinculado a la IP del cliente en ese momento. Si el usuario cambia de IP (IP dinámica, VPN, reinstalación del cliente), el servidor no puede relacionarlo con su `user_id` anterior y su username aparece como "ya en uso".

**Solución propuesta:**
- Generar en el cliente un **identificador UUID v4 estable** almacenado localmente en el keychain del sistema operativo via Tauri (sin enviar datos de hardware al servidor).  
  - En Windows: `Windows Credential Manager`  
  - En macOS: `Keychain`  
  - En Linux: `libsecret` / `.config` fallback  
- Este UUID se genera **una sola vez** en el primer arranque y sobrevive a cambios de IP, reconexiones y reinstalaciones del cliente (salvo borrado manual del keychain).
- El servidor recibe este `client_identity_token` en el `CONNECT` payload y lo usa para localizar al usuario existente en lugar de apoyarse en `resume_session_id` + IP.
- El token **nunca contiene información del hardware** — es solo un UUID aleatorio guardado de forma segura en el cliente.
- ⚠️ Cambio de ordenador: el usuario perderá su identidad (aceptable, se trabaja a futuro).

**Tareas:**
- [ ] Tauri: implementar comando `get_or_create_client_token` que lea/escriba el UUID en el keychain del SO
- [ ] Servidor: aceptar `client_identity_token` opcional en `CONNECT`; si coincide con un user existente, tratar como resume aunque el `user_id` no se envíe
- [ ] Servidor: si `username` enviado coincide con el user del token → permitir reentrada sin error "username taken"
- [ ] Cliente: enviar el token en todos los `CONNECT` + `CONNECT_WITH_ID` payloads
- [ ] Tests de regresión: usuario con IP dinámica, reinstalación limpia, cambio de máquina

---

### 0.5.22 / 0.5.23 — Installer Fix + Private Messaging ✅

- [x] **NSIS installer launch checkbox (0.5.22)** — Fixed "Launch Nexum" checkbox not working after NSIS install. Added `nsis.installMode: "currentUser"` to `tauri.conf.json`.

- [x] **Private direct messages (0.5.23)** — End-to-end encrypted DMs between server members
  - ✅ Server: `direct_messages` DB table (id, sender_id, recipient_id, encrypted_content, created_at)
  - ✅ Server: `SEND_DM` + `GET_DM_HISTORY` WebSocket message types + handlers
  - ✅ Client: `dmCrypto.ts` — AES-GCM 256 + PBKDF2(100k) key derivation with module-level cache
  - ✅ Client: `DirectMessageView` component with message grouping, date separators, privacy banner
  - ✅ Client: UserListPanel popover (click user → inline input + "Send message" button)
  - ✅ Client: DM tab bar in MainView (Server tab + DM tabs with × close)
  - ✅ Client: App.tsx DM state (`dmMessages`, `openDmTabs`, `activeDmUserId`) + handlers
  - Future: unread message badges on DM tabs
  - Future: true forward-secret key exchange (ECDH)
  - Future: message delete/edit in DMs

### 0.5.0 Admin Features & UX Polish ✅

- [x] **Username persistence** — server sends username back in `WELCOME`, saved to localStorage; no more username prompts on reconnect
- [x] **Pre-WELCOME error guard** — if server rejects `resume_session_id` (e.g. DB wiped), clear stored userId and redirect to username modal gracefully
- [x] **Channel rename from UI** — owners hover channel row to reveal pencil icon; inline edit commits on Enter/blur, cancels on Escape; broadcasts `CHANNEL_RENAMED` to all clients
- [x] **Channel delete from UI** — owners hover channel row to reveal trash icon; delete sends `DELETE_CHANNEL` with confirm dialog
- [x] **Editable server settings panel** — `ServerSettingsModal` is now fully editable (name, admin password, max users, max voice users, max message size); WS/UDP ports shown read-only; saves to `server.toml` live via `Config::save()`
- [x] **Server user list** — owners can open `UserListModal` from sidebar "View Users" button; shows all registered users with role, join date, avatar initial
- [x] **`AppState.config` → `RwLock<Config>`** — server settings can be updated live without restart
- [x] **`WelcomePayload.username`** — server now includes username in WELCOME response
- [x] **Admin auth error feedback** — incorrect password shows red error message below input field
- [x] **Admin auth moved to dropdown** — removed standalone button, added to user avatar dropdown menu
- [x] **Secure password change** — requires current password verification + double entry validation
- [x] **Username persistence bug fix** — reload server from localStorage after clearing invalid userId
- [x] **Dark mode color update** — replaced all blue accents with gray (31 replacements across 10 files)
- [x] **App tagline change** — "Secure voice and text communication" instead of "Manage your servers"
- [x] **Client settings panel** — modal with placeholders for auto-start, language, theme, audio devices
- [x] **Documentation reorganization** — moved 10 .md files into `docs/` folder

### 0.5.1 Installation Architecture ✅

- [x] Design unified installation structure (client + server same directory)
- [x] Configure Tauri bundle to include server binary (`tauri.conf.json` → resources)
- [x] Create unified build script (`build.ps1` with `-Release`, `-Bundle`, `-ServerOnly` flags)
- [ ] Test installation on clean Windows system

### 0.5.2 Avatar System & User UI ✅

- [x] **Avatar file upload support** — server accepts image files up to 10MB (jpg, png, gif, webp)
- [x] **Avatar URL support** — users can also provide direct image URLs
- [x] **Avatar storage** — server stores files in `avatars/` directory, serves via `/avatars` endpoint
- [x] **Avatar upload endpoint** — `/api/upload-avatar` accepts multipart/form-data
- [x] **Avatar modal with tabs** — "Upload File" and "Use URL" tabs in client
- [x] **Real-time avatar updates** — avatar appears in profile immediately after upload/save
- [x] **User settings modal** — dropdown now has "User Settings" with "Change Avatar" option
- [x] **Right sidebar user list** — displays all server users with avatars, roles, "(you)" indicator
- [x] **Button styling consistency** — Cancel buttons are gray with gray text, Save buttons are blue
- [x] **User list loading fix** — removed owner-only restriction from GET_USERS, now accessible to all authenticated users
- [x] **Avatar display after upload fix** — client constructs full URLs from server's avatar_path + serverAddress

### 0.5.3 Home Screen UX Redesign ✅

- [x] **Server dropdown navigation** — moved local server management from card to header dropdown
- [x] **Settings dropdown with sections** — General (app/language/appearance) and Voice & Video (audio devices)
- [x] **Minimal add server button** — changed from card-style button to icon-only "+"
- [x] **Server name auto-fetch** — removed manual name field, server sends real name in WELCOME message
- [x] **Client settings tabs** — reorganized modal into General and Voice & Video sections
- [x] **Removed gear icon** — consolidated settings access into dropdown menu
- [x] **Server card connect button** — replaced text button with icon-only button with tooltip

### 0.5.4 Light Mode Theme Analysis & Implementation ✅

**Priority: MEDIUM - COMPLETED 2026-02-24**

Analyze and implement light theme support across entire application.

#### Implementation Completed ✅

**Core Features Implemented:**

- [x] Create theme context/provider in React (`ThemeContext.tsx`)
- [x] Define color palette for both themes in `theme.ts`
- [x] Create `useAppTheme` hook for theme consumption
- [x] Persist theme preference in localStorage
- [x] Update all component classes to use theme-aware utilities
- [x] Test all components in both themes (dark and light)
- [x] Wire theme selector in ClientSettingsModal to actual theme switching
- [x] Add smooth transition between themes

**Visual Refinements:**

- [x] Revised light mode color palette (`#f8f9fa` main bg, `#ffffff` cards)
- [x] Fixed light mode visibility issues (headers, dropdowns, server cards)
- [x] Added borders between 3-panel layout for clear separation
- [x] Implemented minimalist button design (no bold, subtle backgrounds)
- [x] Renamed "User Settings" to "Profile" with user icon
- [x] Added cursor-pointer to all clickable elements

**Components Updated:** 20+ files  
**Classes Modified:** 500+ Tailwind classes  
**Build Status:** ✅ Clean client & server builds

### 0.5.5 Message System Enhancements ✅

**Priority: HIGH - Completed**

Improve messaging system with avatar display, user profiles, and message management.

#### Bug Fixes

- [x] **Avatar display in messages** — User avatars not showing in text channel messages (showing default instead of uploaded avatar)
  - ✅ Extended MessagePayload to include avatar_url, avatar_path, avatar_version
  - ✅ Updated server to propagate avatar information in message broadcasts
  - ✅ Modified get_message_history to fetch avatar data from users table
  - ✅ ChatArea now constructs avatar URLs and displays images
  - ✅ Commit: `dbe7db2` - "fix: Display user avatars in chat messages"

#### New Features

- [x] **User profile modal (clickable users)** — Click on user in member list or message shows user info popup
  - ✅ Created UserProfileModal component
  - ✅ Shows avatar, username, role badge, user ID, join date
  - ✅ Accessible from message usernames (click)
  - ✅ Accessible from member list (click)
  - ✅ Owner users get special badge and info note
  - ✅ Commit: `11ec55c` - "feat: Add user profile modal"

- [x] **Message deletion** — Users can delete their own messages
  - ✅ Added DELETE_MESSAGE protocol implementation (client + server)
  - ✅ Delete button on message hover (trash icon, owner-only)
  - ✅ Confirmation dialog before deletion
  - ✅ Soft delete: message kept with deletion metadata
  - ✅ Display: "Message deleted by: {username}" (gray italic)
  - ✅ Database migration for deleted_by_user_id, deleted_at
  - ✅ Real-time broadcast via WebSocket
  - ✅ Commit: `517bebf` - "feat: Implement message deletion"
  - Future: Mod/admin can delete any message

- [x] **Message editing** — Users can edit their own messages
  - ✅ Add edit icon on message hover (pencil icon)
  - ✅ Inline edit with input field (Enter to save, Escape to cancel)
  - ✅ Server: `EDIT_MESSAGE` WebSocket event
  - ✅ Show "(edited)" label next to timestamp
  - ✅ Server: Store edit history (edited_at timestamp) in DB
  - ✅ Broadcast updated message to all channel members
  - ✅ Commit: `3f7c5f1` - "feat: Implement message editing"
  - Future: Show edit history on hover

#### Technical Implementation

**Protocol Changes:**

- ✅ `DELETE_MESSAGE` client message type + DeleteMessagePayload
- ✅ `MESSAGE_DELETED` server message type + MessageDeletedPayload
- ✅ `EDIT_MESSAGE` client message type + EditMessagePayload
- ✅ `MESSAGE_EDITED` server message type + MessageEditedPayload
- ✅ Extended `Message` model with `deleted_by`, `deleted_at` fields
- ✅ Added `edited_at` field to `Message` model

**Database Schema:**

```sql
✅ ALTER TABLE messages ADD COLUMN deleted_by_user_id TEXT;
✅ ALTER TABLE messages ADD COLUMN deleted_at INTEGER;
✅ ALTER TABLE messages ADD COLUMN edited_at INTEGER;
```

**Component Updates:**

- ✅ `ChatArea.tsx` - Added message delete button
- ✅ `UserProfileModal.tsx` (NEW) - Modal showing user details
- ✅ Message hover state with delete action button
- ✅ Avatar rendering fix in message component
- ✅ Add edit button to message hover state
- ✅ Add inline edit mode for messages

**UI/UX Improvements:**

- ✅ Added cursor pointer to avatars (clickable to view profile)
- ✅ Added cursor pointer to message content (clickable to view sender profile)
- ✅ Changed default theme to dark mode on first launch
- ✅ Restricted User ID visibility to owners only (privacy enhancement)

### 0.5.6 Documentation & Release Structure ✅

**Priority: LOW - Housekeeping**

- [ ] **Simplify releases structure** — Consolidate README files
  - Remove redundant `releases/README.md` (generic overview)
  - Keep `releases/v0.X.X/README.md` for version-specific release notes
  - Update release workflow to only maintain version-specific READMEs
  - Generic release info should be in main project README

### 0.5.7 Local Server Detection & Configuration ✅

**Priority: HIGH - Bug Fix + Feature Enhancement**

#### Problem

The local server detection is not working correctly:

- Client shows "Not installed" even when server is in the same directory
- Example case: `E:\voice_mvp\` contains `voice-client.exe`, `voice-server.exe`, and `Uninstall Nexum.exe` but detection fails
- Users cannot manually specify server path if it's in a non-standard location

#### Tasks

- [x] **Fix automatic server detection** — Improved detection with 6 executable name variants and prioritized path order (same dir > CWD > resources > standard paths)
- [x] **Manual server path configuration** — "Configure Server Path" button with file picker (Tauri dialog plugin)
- [x] **Server process isolation** — Server now runs from `~/.nexum/server/` instead of inheriting client CWD (was polluting `src-tauri/` with `data/`, `server.toml`)
- [x] **Fix IP restriction bug** — Removed one-IP-per-user restriction; multiple users from localhost or same NAT now work
- [x] **Fix username taken error loop** — Client now stops auto-reconnect on pre-auth errors, shows message to user
- [x] **Add `--data-path` CLI argument to server** — Server accepts custom data directory via `--data-path` argument

### 0.5.8 Remove Redundant "View Users" Button ✅

**Priority: LOW - UI Cleanup - COMPLETED 2026-02-25**

#### Problem

After implementing the right sidebar user list in 0.5.2, the "View Users" button in the admin dropdown was redundant. All users (not just admins) can see the server members in the right panel.

#### Implemented ✅

- [x] Removed `onViewUsers` prop and button from `MainView.tsx`
- [x] Removed `handleGetUsers` function from `App.tsx`
- [x] Removed `showUserListModal` state and `UserListModal` import/render from `App.tsx`
- [x] `UserListModal.tsx` preserved for reuse in **0.5.12 Moderation System**
- [x] TypeScript: `tsc --noEmit` — clean
- [x] Rust: `cargo check` — clean

**Affected files:** `client/src/components/MainView.tsx`, `client/src/App.tsx`

### 0.5.9 Channel Categories & Organization ✅

**Priority: MEDIUM - Feature Enhancement - COMPLETED**

#### Problem

Servers with many channels become cluttered and hard to navigate. Users need a way to organize channels into logical groups.

#### Proposed Solution

Implement collapsible channel categories similar to Discord's approach:

- Categories are visual groupings (not separate entities in DB)
- Channels can belong to a category or be uncategorized
- Categories can be collapsed/expanded per user (saved in localStorage)
- Admins can create, rename, and delete categories
- Admins can drag channels between categories

#### Tasks

- [x] **Database schema update** — Add category support
  - Add `category_id` (optional) to channels table
  - Create `categories` table: `id`, `name`, `position`, `created_at`
  - Migration script for existing channels (all uncategorized initially)

- [x] **Backend protocol changes** — Category CRUD operations
  - Add `CREATE_CATEGORY` client message
  - Add `DELETE_CATEGORY` client message
  - Add `RENAME_CATEGORY` client message
  - Add `MOVE_CHANNEL_TO_CATEGORY` client message
  - Add corresponding server broadcast messages (`CATEGORY_CREATED`, `CATEGORY_DELETED`, `CATEGORY_RENAMED`, `CHANNEL_MOVED`)
  - Update `WELCOME` payload to include categories

- [x] **Frontend UI implementation** — Category display and interaction
  - Update ChannelList to render categories with channels inside
  - Add collapse/expand chevron next to category name
  - Store collapsed state per category in localStorage
  - Add "Add Category" button for owners (inline creation)
  - Add inline rename/delete controls for category and channel rows

- [x] **Category management** — Admin controls
  - Inline rename and delete for categories
  - Drag-drop channels between categories (HTML5 native API)
  - Delete category moves channels to uncategorized
  - Channels without category_id render in "Channels" section

**Build Status:** ✅ Clean client & server builds

### 0.5.10 Auto-start on System Boot ✅

**Priority: LOW - COMPLETED 2026-02-25**

#### Implemented ✅

- [x] **Backend implementation** — 3 Tauri commands using `winreg` crate
  - `is_auto_start_enabled(app_handle)` — reads `HKCU\Run` registry key
  - `enable_auto_start(app_handle)` — writes exe path to `HKCU\Run`
  - `disable_auto_start(app_handle)` — removes key from `HKCU\Run`
  - Windows-only (`#[cfg(windows)]`); returns `false`/error on other platforms
- [x] **Frontend implementation** — Settings UI toggle
  - Toggle loads real registry state on modal open (`useEffect` + `invoke`)
  - Calls enable/disable commands on change; grayed out while pending
  - Label: "Launch Nexum at Windows startup"
- [x] Rust: `cargo check` — clean, no errors
- [x] TypeScript: `tsc --noEmit` — clean, no errors

**Affected files:**

- `client/src-tauri/Cargo.toml` — added `winreg = "0.52"` (Windows-only)
- `client/src-tauri/src/main.rs` — 3 new commands + registered in invoke_handler
- `client/src/components/ClientSettingsModal.tsx` — wired toggle to real commands

### 0.5.11 Local Server Management UI ✅

**Priority: MEDIUM - Completed**

#### Problem

Once the local server was running, the "Configure Server" button in the dropdown did nothing. There was no way to stop the server, reset the admin password, or wipe server data from the client UI.

#### Implemented ✅

- [x] **Server dropdown three-way split** — running: Stop Server (red) + Configure Server (gear); installed+stopped: Start Server; not installed: existing path controls
- [x] **Local Server Management Modal** — tabbed panel opened by "Configure Server" when running
  - ✅ Overview tab: running/stopped badge, data directory path, Stop/Start toggle
  - ✅ Reset Password tab: password input + Generate; stops server, deletes `server.toml`, relaunches with new password
  - ✅ Delete Data tab: requires server to be **stopped first** (explicit blocking step), two-step confirmation (type `DELETE`), wipes `~/.nexum/server/data/`, keeps `server.toml`
- [x] **Auto-connect error feedback** — When a saved server is unreachable, the connection modal now opens with a clear error message instead of failing silently
- [x] **New Tauri commands**: `reset_admin_password`, `delete_server_data`
- [x] **New Rust methods**: `ServerManager::reset_admin_password()`, `ServerManager::delete_server_data()`
- Commits: `7097a7e`, `45a7647`, `(delete-data-ux)`
- Starts polling server health when modal is open

**Edge cases:**

- Disable password reset if server is running
- Show clear warning before data wipe
- Refresh `localServerStatus` after stop/start actions

- [ ] Add private message functionality (click user in sidebar to DM)
- [ ] Implement end-to-end encryption for private messages
- [ ] Add encryption indicator in private chat UI

### 0.5.12 Moderation System 🚧

**Priority: MEDIUM - Safety & Administration**

Enable server owners to manage disruptive users.

#### Tasks

- [ ] **Kick user** — owner can remove a user from the server (disconnects them; they can rejoin)
- [ ] **Ban user** — owner can permanently ban by user ID + IP address; banned users cannot reconnect
- [ ] **Voice mute** — owner mutes a specific user's microphone (they hear others but nobody hears them)
- [ ] **Text mute** — owner restricts a user from sending messages in text channels
- [ ] **Ban list** — admin panel tab showing all bans with username, IP, date; ability to unban
- [ ] **Protocol changes** — `KICK_USER`, `BAN_USER`, `UNBAN_USER`, `MUTE_USER`, `UNMUTE_USER` client messages + server broadcasts
- [ ] **Persistence** — bans stored in SQLite `bans` table (`user_id`, `ip_address`, `banned_at`, `reason`)
- [ ] **Connection check** — server checks ban list on every new connection attempt

### 0.5.13 Server Join Password ✅

**Priority: LOW - Privacy Feature**

Allow server owners to require a password for joining, making the server private.

#### Tasks

- [x] **Config field** — added `join_password: Option<String>` to `ServerConfig` in `server.toml`; default `None` (public server)
- [x] **Protocol change** — `ConnectPayload` gains optional `join_password` field; new `ErrorCode::PasswordRequired` returned when missing or wrong; server distinguishes "not provided" vs "incorrect" with distinct messages
- [x] **UI — join flow** — `JoinPasswordModal.tsx` shown when server returns `PASSWORD_REQUIRED`; retries with password attached to `CONNECT` payload; shows error on wrong password
- [x] **Server settings** — "Private Server" toggle + join password field added to Security tab of `ServerConfigModal` (both pre-launch and manage modes); `UpdateServerSettingsPayload` gains `join_password` field; empty string clears (makes public)
- [x] **`is_private` flag in `ServerSettingsPayload`** — server sends `is_private: bool` so the client knows privacy status without revealing the actual password
- [x] **Empty = open** — empty string / absent field means no password required

### 0.5.16 Server Disconnect Detection ✅

**Priority: HIGH - Critical UX Bug**

**Bug:** When the server process is killed while clients are connected, the clients do not react at all. They remain on the "connected" view showing a stale UI. They only discover something is wrong when they try to interact (send a message, etc.).

#### Expected Behavior

- When the WebSocket connection closes unexpectedly and all reconnect attempts are exhausted, the client should navigate back to the server-list view with a clear "Lost connection to server" error message.
- While reconnect attempts are in progress, show a visible "Reconnecting…" banner in the connected view.

#### Tasks

- [x] Add `onGiveUp?: () => void` callback to `WebSocketClient` — fires when all `maxReconnectAttempts` are exhausted
- [x] In `WebSocketClient.onclose`: call `onGiveUp?.()` when reconnect loop will not retry
- [x] In App.tsx `handleConnectWithUserId` and `handleConnect`: set `wsClient.onGiveUp` to navigate to `server-list` with a "Lost connection to server" error
- [x] Add "Reconnecting…" status indicator in the connected view (based on `connection.connecting` flag already in state)

**Affected files:** `client/src/lib/websocket.ts`, `client/src/App.tsx`, `client/src/components/MainView.tsx`

---

### 0.5.17 Channel Deletion Bug Fix ✅

**Priority: HIGH - Functionality Bug**

**Bug:** Clicking the trash icon on a channel shows the delete confirmation UI (✓ / ✕). However, clicking ✓ does nothing — the channel is not deleted from the list and no error is shown.

#### Root Causes

1. **Client (ChannelList.tsx):** The channel row `div` has `draggable={isOwner}` applied even when the delete-confirmation UI is active. On Tauri/WebView, the draggable attribute on a parent can suppress click events on child buttons in certain configurations. The ✓ button clicks are intercepted before the handler fires.
2. **Server (handlers.rs / db.rs):** `delete_channel` does not delete associated messages first. If SQLite foreign-key enforcement is active (it is enabled per-connection in some rusqlite builds), the `DELETE FROM channels` statement fails silently, no `CHANNEL_DELETED` broadcast is sent, and the client sees nothing happen. Even when FK enforcement is off, messages remain as orphaned rows.

#### Tasks

- [x] **Client — `ChannelList.tsx`:** Change `draggable={isOwner}` to `draggable={isOwner && !isDeleting && !isRenaming}` so the row is never draggable while edit/delete UI is active
- [x] **Client — `ChannelList.tsx`:** Add `e.stopPropagation()` to the ✓ confirm button `onClick` to prevent any parent event interference
- [x] **Server — `db.rs`:** Add `delete_channel_messages(channel_id: Uuid) -> Result<()>` method that deletes all messages for a channel
- [x] **Server — `handlers.rs`:** In `handle_delete_channel`, call `state.db.delete_channel_messages(payload.channel_id)?` before `state.db.delete_channel(...)` — ensures cascade cleanup and no FK violations
- [x] **Server — `handlers.rs`:** Wrap DB errors in `send_error` so the client receives feedback if deletion fails

**Affected files:** `client/src/components/ChannelList.tsx`, `server/src/db.rs`, `server/src/handlers.rs`

---

### 0.5.18 Pre-launch Admin Password Reset ✅

**Priority: HIGH - UX Gap**

**Problem:** When clicking "Start Server" with a server already configured, the Security tab shows a static info note saying "To change the password use Server → Configure Server → Reset Password after the server is running." The user cannot reset the admin password from the pre-launch modal — they are forced to start the server first, connect, open manage mode and change it there.

#### Tasks

- [x] **Rust — `client/src-tauri/src/main.rs`:** Add `update_server_admin_password(new_password: String)` Tauri command
  - Reads `~/.nexum/server/server.toml`, replaces the `admin_password = "..."` line, writes back
  - Returns error if server currently running or if server.toml does not exist
  - Register in `invoke_handler`
- [x] **Frontend — `ServerConfigModal.tsx`:** Replace static info note (pre-launch + isConfigured) with an inline password reset section:
  - Collapses behind a "Reset Password" button; clicking it reveals: new password input + Generate button + "Update" button
  - On "Update": calls `update_server_admin_password`, shows success/error feedback inline
  - On "Launch Server": if `newAdminPassword` is non-empty and not yet saved, auto-call `update_server_admin_password` before starting

**Affected files:** `client/src-tauri/src/main.rs`, `client/src/components/ServerConfigModal.tsx`

---

### 0.5.19 Pre-launch Modal Config Not Persisting ✅

**Priority: HIGH - UX Bug**

**Problem:** When re-opening the "Start Server" modal on an already-configured server, the General tab always showed the default "My Nexum Server" name and default limits instead of the previously saved values. `ServerConfigModal` initialises from the `settings` prop (which is only populated in manage mode) and had no mechanism to read `server.toml` in pre-launch mode.

#### Tasks

- [x] **Rust — `client/src-tauri/src/main.rs`:** Add `read_server_config()` Tauri command — parses `~/.nexum/server/server.toml` line-by-line, returns `{ name, max_users, max_users_per_voice_channel, max_message_size, is_private }` as a serialised struct
- [x] **Frontend — `ServerConfigModal.tsx`:** Add `useEffect` on mount that calls `read_server_config` when `mode === 'pre-launch' && isConfigured`, then sets `serverName`, `maxUsers`, `maxVoice`, `maxMessage`, `isPrivate` from the result

**Affected files:** `client/src-tauri/src/main.rs`, `client/src/components/ServerConfigModal.tsx`

---

### 0.5.20 Standalone Server First-Run Setup Wizard ✅

**Priority: HIGH - Missing UX**

**Problem:** The standalone server binary only asked for an admin password on first run. It did not ask for server name or whether the server should be public or private, even though these settings exist in `server.toml` and are fully supported. Users were forced to edit the TOML file manually after setup.

#### Tasks

- [x] **Expand `prompt_for_setup()` in `server/src/config.rs`** — replace the old password-only `prompt_for_password()` with a full wizard:
  - Step 1: Server name (`dialoguer::Input` with default "My Nexum Server")
  - Step 2: Admin password (existing generate/manual logic, unchanged)
  - Step 3: Server visibility — Public / Private; if Private, prompts for join password (`dialoguer::Password` with confirmation)
  - Returns `(name, password, join_password)` tuple; applies all three fields to `Config` before writing `server.toml`
- [x] **Add `--server-name` and `--join-password` CLI args to `server/src/main.rs`** — for non-interactive/scripted launches (bypasses wizard, uses provided values or defaults)
- [x] **Updated confirmation printout** — shows Server name and Visibility (🌐 Public / 🔒 Private) alongside admin password

**Affected files:** `server/src/config.rs`, `server/src/main.rs`

---

### 0.5.21 Standalone Server Data Path Unification ✅

**Priority: HIGH - Data Consistency Bug**

**Problem:** The standalone server stored `server.toml` and `data/` in the current working directory (wherever the user launched the binary). The Tauri client always used `~/.nexum/server/`. This meant a server configured via the client would not be found when re-launched standalone, and vice-versa — effectively two isolated environments.

#### Tasks

- [x] **`server/Cargo.toml`**: Add `dirs = "5.0"` dependency
- [x] **`server/src/config.rs`**: Add `nexum_server_dir()` helper that returns `~/.nexum/server/`; update `Config::load()` to use it as default config and data path (respects existing `CONFIG_PATH` env var override)

**Affected files:** `server/src/config.rs`, `server/Cargo.toml`

---

### 0.5.14 Notification System 🚧

**Priority: LOW - User Convenience**

Notify users of activity while the app is in the background.

#### Tasks

- [ ] **System tray icon** — app stays in tray when window is closed (instead of exiting)
- [ ] **Desktop notification** — show OS notification when a message arrives in a channel the user has joined while the window is not focused
- [ ] **Tray badge / unread count** — tray icon shows badge or tooltip with unread message count
- [ ] **Do-not-disturb setting** — toggle in Client Settings to suppress all notifications
- [ ] **Mention detection** — highlight messages that contain `@username` in a different color; trigger notification even if window is focused

### 0.5.15 Server Launch UX & Unified Server Config Modal 🚧

**Priority: HIGH - UX Gap + Refactor**

#### Problem

1. When the user clicks "Start Server" in the Server dropdown, the server starts but gives zero feedback — no config step, no spinner, no "ready" notification, no "Connect now" shortcut.
2. `ServerSettingsModal` (used when connected as admin) is a flat list with no tabs — no room for future sections (Moderation, etc.).

#### Solution

Replace both flows with a single unified `ServerConfigModal` component that adapts to two modes:

- **`pre-launch` mode** — opens when user clicks "Start Server"; shows tabbed config, launches server, shows progress, shows "ready + Connect Now" on success.
- **`manage` mode** — replaces `ServerSettingsModal` when connected as admin; shows same tabs with live-edit of running server settings.

#### Subtasks

**Rust — `server_manager.rs` + `main.rs`**

- [x] Add `write_initial_server_config(name, max_users, max_voice, max_message)` Tauri command
  - Writes `~/.nexum/server/server.toml` with provided values before first launch
  - Only intended for pre-launch first-time configuration
  - Registered in `invoke_handler`
- [x] Add `check_server_ready(port)` Tauri command
  - TCP connect to `127.0.0.1:port` with 500 ms timeout
  - Returns `true` when server is accepting connections
  - Registered in `invoke_handler`

**Frontend — `ServerConfigModal.tsx` (new component)**

- [x] Create `ServerConfigModal.tsx` with props: `mode`, `isConfigured`, `port`, `settings?`, `onClose`, `onSaveSettings?`, `onChangePassword?`, `onConnectNow?`
- [x] Tab: **General** — server name input + Max Users + Max Voice Channel Users + Max Message Size
- [x] Tab: **Security**
  - Pre-launch + unconfigured: admin password input + Generate button (min 8 chars)
  - Pre-launch + configured: read-only note ("Server already configured — use Reset Password to change")
  - Manage mode: "Change Admin Password" button → calls `onChangePassword`
- [x] Tab: **Moderation** — placeholder "Coming in 0.5.12"
- [x] Pre-launch launch flow (internal state machine):
  - [x] `phase: 'config' | 'launching' | 'ready' | 'error'`
  - [x] `phase='config'`: form displayed, footer shows "Launch Server" button
  - [x] On launch: if first time → call `write_initial_server_config`, then `start_local_server`; if configured → just `start_local_server`
  - [x] `phase='launching'`: spinner overlay, polls `check_server_health` + `check_server_ready` every 1 s, times out after 30 s
  - [x] `phase='ready'`: success banner with WS address + "Connect Now" button (calls `onConnectNow`)
  - [x] `phase='error'`: error message + "Try Again" button (resets to `phase='config'`)
- [x] Manage mode: save/close behavior identical to old `ServerSettingsModal`

**Refactor — replace `ServerSettingsModal`**

- [x] Replace `<ServerSettingsModal>` usage in `App.tsx` with `<ServerConfigModal mode='manage'>`
- [x] Remove `ServerSettingsModal.tsx` from codebase
- [x] Remove `import ServerSettingsModal` from `App.tsx`

**Wire to `App.tsx`**

- [x] Open `<ServerConfigModal mode='pre-launch'>` from `handleLaunchLocalServer` (replaces old `showLocalServerSetupModal`)
- [x] Remove old states: `showLocalServerSetupModal`, `localSetupPassword`, `localSetupError`, `localSetupLaunching`
- [x] Add `showServerConfigModal: boolean` + `isServerConfigured: boolean` states
- [x] Pass `onConnectNow` (`handleServerConnectNow`): auto-adds local server entry if missing + opens `ServerConnectModal`
- [x] Pass `isConfigured` from `invoke('is_server_configured')` called on modal open

**Validation**

- [x] `tsc --noEmit` — clean
- [x] `cargo check` — clean

**Docs**

- [x] `changelog.md` updated
- [x] `todo.md` subtasks ticked

### 0.5.3 Server Detection ✅

- [x] Create `server_manager.rs` module in client backend
- [x] Implement `detect_server()` function (searches ~7 common install paths)
- [x] Implement `get_server_path()` logic inside detect
- [x] Add Tauri command `detect_local_server()`
- [x] Unit tests passing (3/3)

### 0.5.3 Server Control ✅

- [x] Implement `start_local_server()` command
  - [x] Launch server process with `--non-interactive`
  - [x] Track process handle in AppState (Arc<Mutex<Option<Child>>>)
  - [x] Status tracking (NotInstalled/Stopped/Starting/Running/Error)
- [x] Implement `stop_local_server()` command (kill + wait)
- [x] Implement `get_server_status()` command
- [x] Implement `check_server_health()` - detects crashed processes

### 0.5.4 Initial Setup Flow ✅

- [x] Create first-run detection (`is_server_configured()` → checks server.toml)
- [x] Password input integrated in `LocalServerPanel`
  - [x] Password input field
  - [x] "Generate" button (16-char random)
  - [x] Only shown on first setup (no server.toml)
- [x] Pass `--admin-password` on first start
- [ ] Persist password securely in system keychain

### 0.5.5 UI Components ✅

- [x] Create `LocalServerPanel` component
  - [x] Server status indicator with animated pulse
  - [x] Start/Stop buttons with loading states
  - [x] Port info display (WS + UDP)
  - [x] PID display when running
  - [x] Refresh button (🔄)
  - [x] Error display area
  - [x] Binary path display for troubleshooting
- [x] Integrate `LocalServerPanel` into `ConnectView`
- [ ] Collapse/expand panel option
- [x] "Connect to Local" quick button after server starts — "Connect Now →" button in launch modal

### 0.5.6 Auto-Connection 🚧

- [x] Auto-fill `localhost:8080` on server start
- [x] Auto-trigger Connect after server starts — "Connect Now →" in launch ready step
- [ ] Handle connection failures gracefully
- [ ] Add retry logic with exponential backoff

### 0.5.7 Configuration Management 🚧

- [x] Add "Local Server Settings" to Settings modal — implemented as `ServerConfigModal` (tabbed: General, Security, Moderation)
  - [x] Change admin password — Security tab (manage mode + pre-launch 0.5.18)
  - [ ] Change server ports (WS / UDP)
  - [x] Toggle auto-start on client launch — Auto-start toggle in Client Settings (0.5.10)
  - [ ] View last server log lines
- [x] Implement config file editing from client — `write_initial_server_config` + `update_server_admin_password` + `read_server_config`
- [ ] Restart server when config changes
- [ ] Validate configuration before applying

### 0.5.8 Setup Wizard 🚧

- [ ] Create first-launch wizard component
  - [ ] Welcome screen
  - [ ] "Host local server" vs "Connect to remote" choice
  - [ ] Password setup step (if hosting)
  - [ ] Connection test / confirmation
- [ ] Save wizard completion state (localStorage)
- [ ] Skip wizard on subsequent launches

### 0.5.9 Build & Distribution ✅

- [x] Create unified build script (`build.ps1`)
- [x] Bundle server binary with client in installer
- [ ] Test installer on clean machine
- [ ] Verify both client and server are installed together
- [ ] Test uninstallation (clean removal)

### 0.5.10 Documentation 🚧

- [ ] Update README with new installation process
- [ ] Create user guide for local server mode
- [ ] Document troubleshooting steps
- [ ] Add FAQ for common issues

**Reference:** See [CLIENT_SERVER_INTEGRATION.md](CLIENT_SERVER_INTEGRATION.md) for detailed design.

---

## ✅ Phase 0: Project Setup (COMPLETED)

- [x] Create documentation structure
- [x] Define technology stack
- [x] Create server project with Cargo.toml
- [x] Create client project with Tauri
- [x] Create protocol types definition

---

## ✅ Phase 1: Server Core (COMPLETED)

### 1.1 Project Structure ✅

- [x] Initialize Cargo project in `server/`
- [x] Set up folder structure (all files created)
- [x] Add all dependencies to Cargo.toml

**Decisions Made:**

- Using env vars and TOML config (no CLI args for MVP)
- Default ports: WebSocket (8080), UDP (9000)

### 1.2 Configuration ✅

- [x] Create `server.toml` example
- [x] Implement config loader with serde
- [x] Add default values
- [x] Support environment variable overrides

**Decisions Made:**

- Config in `./server.toml` (same folder)
- maxUsers requires restart to change

### 1.3 Database Setup ✅

- [x] Define SQL schema (users, channels, messages, call_history, server_config)
- [x] Implement SQLite connection (Arc<Mutex<Connection>>)
- [x] Write init_db() function
- [x] Add CRUD for users, channels, messages

**Decisions Made:**

- Single connection wrapped in Arc<Mutex> (sufficient for MVP)
- Hard deletes (no soft delete for MVP)

### 1.4 WebSocket Server ✅

- [x] Set up Axum router
- [x] Implement WebSocket upgrade handler
- [x] Create session manager (HashMap)
- [x] Implement CONNECT handshake
- [x] Implement WELCOME response
- [x] Implement ERROR responses
- [x] Add ping/pong keepalive

**Decisions Made:**

- No username validation (accepts any string 1-32 chars)
- No per-IP connection limit for MVP

---

## ✅ Phase 2: Domain Logic (COMPLETED)

### 2.1 User Management ✅

- [x] Create user on first connect
- [x] Assign userId (UUID)
- [x] Store in database
- [x] Handle username changes (DB method exists)
- [x] Implement role assignment (owner vs member)

**Decisions Made:**

- First user is always owner
- Owner role transfer not implemented in MVP

### 2.2 Channel Management ✅

- [x] CREATE_CHANNEL message handler
- [x] DELETE_CHANNEL message handler
- [x] LIST_CHANNELS (sent on WELCOME)
- [x] JOIN_CHANNEL logic
- [x] LEAVE_CHANNEL logic
- [x] Enforce max_users per channel

**Decisions Made:**

- No channel descriptions for MVP
- No channel renaming for MVP

### 2.3 Text Messaging ✅

- [x] SEND_MESSAGE handler
- [x] Validate message size (2000 chars)
- [x] Store in database
- [x] Broadcast to channel members
- [x] Rate limiting (basic structure, not enforced)

**Decisions Made:**

- Rate limit: 60 messages/minute (configured, not enforced yet)
- Empty messages blocked by UI

### 2.4 Role Enforcement ✅

- [x] Check permissions for channel creation
- [x] Check permissions for channel deletion
- [x] Return ERROR on unauthorized actions
- [ ] Kick actions → covered by **0.5.12 Moderation System** (kick, ban, mute)

---

## ⚠️ Phase 3: Voice Integration (PARTIAL)

### 3.1 UDP Server ⚠️

- [x] Bind UDP socket
- [x] Parse incoming packets (version + sessionId + opus)
- [x] Validate session exists
- [x] Identify user's current voice channel
- [ ] 🚧 **Forward packet to all other channel members** (needs UDP address tracking)
- [x] Handle errors gracefully (no crash on bad packets)

**Known Issue:** UDP address registration per session not implemented

**Decisions Made:**

- Validate packet structure, drop invalid
- Drop packets from non-authenticated sessions

### 3.2 Voice Channel State ✅

- [x] Track active voice connections per channel
- [x] JOIN_VOICE handler
- [x] LEAVE_VOICE handler
- [x] Notify channel members on join/leave
- [x] Enforce max_users_per_voice_channel

**Decisions Made:**

- Auto-leave voice on disconnect (yes)
- No "speaking" state tracking for MVP

### 3.3 Call History ❌

- [ ] Log call start time (deferred)
- [ ] Log call end time (deferred)
- [ ] Calculate duration (deferred)
- [ ] Store in call_history table (schema exists, not used)

---

## ✅ Phase 4: Client (MOSTLY COMPLETE)

### 4.1 Project Setup ✅

- [x] Initialize Tauri project
- [x] Set up React + TypeScript
- [x] Configure Tailwind CSS
- [x] Create basic app layout
- [x] No routing needed (single view app)

### 4.2 Connection UI ✅

- [x] Username input field
- [x] Server address input (IP:PORT)
- [x] Connect button
- [x] Connection status indicator
- [x] Error message display

**Decisions Made:**

- No localStorage for username (fresh each time)
- No pre-connect validation (server validates)

### 4.3 WebSocket Client ✅

- [x] Implement WebSocket connection
- [x] Send CONNECT message
- [x] Handle WELCOME response
- [x] Handle ERROR response
- [x] Implement auto-reconnect logic
- [x] Ping/pong handling

**Decisions Made:**

- Reconnect backoff: 1s, 2s, 4s, 8s, max 10s (exponential)
- Show reconnection in connection status (not separate UI)

### 4.4 Main UI ✅

- [x] Channel list sidebar
- [x] Text chat area
- [x] Message input
- [x] Voice controls UI (non-functional)
- [ ] User list per channel (deferred)

**Decisions Made:**

- Fixed layout (no resizing for MVP)
- Show timestamps on messages (yes)

### 4.5 Audio Capture ❌ (NOT IMPLEMENTED)

- [ ] 🚧 Request microphone permission
- [ ] 🚧 Capture audio with Web Audio API
- [ ] 🚧 Encode to Opus (need WASM library)
- [ ] 🚧 Send via UDP
- [ ] 🚧 Implement push-to-talk

**Blocker:** Requires audio engineering expertise and Opus WASM library

### 4.6 Audio Playback ❌ (NOT IMPLEMENTED)

- [ ] 🚧 Receive UDP packets (need Tauri UDP bridge)
- [ ] 🚧 Decode Opus frames
- [ ] 🚧 Mix multiple speakers
- [ ] 🚧 Play through AudioContext
- [ ] 🚧 Handle packet loss

**Blocker:** Requires audio implementation + UDP in Tauri

---

## 🎯 Phase 5: Packaging (CURRENT FOCUS)

### 5.1 Server Binary

- [x] Cross-compile for Windows x64
- [ ] Cross-compile for macOS (Intel + ARM)
- [x] Test binary standalone
- [x] Create default config structure (creates server.example.toml)

### 5.2 Client Bundling ✅

- [x] Embed server binary in Tauri resources
- [x] Implement "Start Local Server" button
- [x] Spawn server process from client
- [ ] Display server logs in UI (optional)
- [x] Handle server process lifecycle

**Decisions:**

- Defer server embedding for MVP
- Focus on standalone client installer first

### 5.3 Installers ✅ **LINUX COMPLETE, WINDOWS DOCUMENTED**

- [x] 🎯 **Verify client compiles successfully**
- [x] 🎯 **Create app icons (PNG, ICO, ICNS)** - Generated via Tauri CLI from SVG
- [x] 🎯 **Configure bundle metadata in tauri.conf.json**
- [x] 🎯 **Build Linux bundles with Tauri** - Generated `.deb`, `.rpm`, `.AppImage`
- [x] 🎯 **Build Windows .msi with Tauri** - Built `Nexum_0.1.3_x64_en-US.msi` + `Nexum_0.1.3_x64-setup.exe`
- [x] 🎯 **Test installation on Windows** - Verified running on Windows
- [ ] Build macOS .dmg with Tauri (later)
- [ ] Test installation flow on macOS (later)

**Status:**

- ✅ Linux builds successful (3.8 MB `.deb`, 74 MB `.AppImage`)
- 📝 Windows build guide created with complete instructions
- ⚠️ Windows `.msi` requires native Windows compilation (not WSL)
- 📦 Build artifacts: `client/src-tauri/target/release/bundle/`

---

## Phase 6: Polish (DEFERRED)

### 6.1 Error Handling

- [x] User-friendly error messages (basic)
- [x] Handle network failures gracefully
- [x] Show connection state clearly
- [x] Auto-reconnect mechanism
- [ ] Better error details (can improve)

### 6.2 UX Improvements

- [ ] Loading states (basic spinners)
- [x] Empty states (no channels, no messages)
- [ ] Keyboard shortcuts
- [ ] Sound notifications

### 6.3 Testing

- [ ] Manual test full flow
- [ ] Test with 2+ clients simultaneously
- [ ] Test voice with multiple users (when audio implemented)
- [x] Test reconnection scenarios (basic)
- [ ] Test server restart scenarios

---

## ❌ Non-MVP (Explicitly Deferred)

All features below are OUT OF SCOPE for initial release:

- [ ] TLS support (use reverse proxy)
- [ ] Message history pagination
- [ ] Message search
- [ ] User profile pictures
- [ ] Custom emojis/reactions
- [ ] File uploads
- [ ] Screen sharing
- [ ] Video chat
- [ ] Mobile apps
- [ ] Web client
- [ ] Multi-server support in single client
- [ ] Server discovery/browser
- [ ] Invite links
- [ ] Message editing
- [ ] Message deletion

---

## 🚨 Current Blockers & Next Steps

### Immediate (This Session)

1. ✅ **Update todo.md** - DONE
2. ✅ **Verify client builds** - DONE (Linux bundles successful)
3. ✅ **Create app icons** - DONE (generated from SVG)
4. 📝 **Build Windows installer** - DOCUMENTED (requires Windows OS)

### Windows Build Next Steps

- Transfer project to Windows machine or WSL2 with Windows access
- Follow [windows_build_guide.md](windows_build_guide.md) instructions
- Install Visual Studio Build Tools + Rust + Node.js on Windows
- Run `npm run tauri build` to generate `.msi` installer

### Known Blockers

1. **Audio implementation:** Requires Web Audio API + Opus WASM + UDP bridge
2. **UDP address tracking:** Server can't send UDP packets to clients yet
3. **Windows builds:** Only possible from Windows OS (not Linux/WSL)
4. **Unit tests missing for new features:** `RENAME_CHANNEL`, `UPDATE_SERVER_SETTINGS`, `GET_USERS` handlers, `db.list_users()`, `db.rename_channel()` — required by Definition of Done before final release

### Technical Debt

- No rate limiting enforcement (structure exists)
- No call history tracking (table exists, unused)
- Message pagination (loads all messages)
- No user list per channel UI

---

_Last updated: 2026-02-21 (Phase 0.5 Extension — admin features + UX polish completed)_
