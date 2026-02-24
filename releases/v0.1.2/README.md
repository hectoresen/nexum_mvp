# Release Notes — Nexum v0.1.2

**Release Date:** February 24, 2026
**Type:** Feature Release + Bug Fixes
**Tag:** `v0.1.2`
**Branch merged:** `develop → main`

---

## 📦 Downloads

### Client Application (Desktop)

- **Nexum_0.1.2_x64_en-US.msi** (~7.1 MB) — Windows MSI installer (recommended)
- **Nexum_0.1.2_x64-setup.exe** (~4.8 MB) — NSIS portable installer

### Server Application (Standalone)

- **Nexum-Server_0.1.2_x64.exe** (~7.3 MB) — Standalone server binary for dedicated hosting

---

## ✨ What's New Since v0.1.0

### 🗂️ Channel Categories (0.5.9)

Servers with many channels can now be organized into collapsible categories.

- Create, rename, and delete categories (owner only)
- Drag and drop channels between categories via the channel list
- Collapse / expand categories per user (saved to localStorage)
- Per-category **+** button to create a channel directly inside a category
- Category dropdown in the create-channel form
- Uncategorized channels render cleanly below all categories (no fake "Channels" header)

### 🌙 Light Mode Theme (0.5.4 / v0.1.1)

Full light / dark theme support across the entire application.

- Revised light palette (`#f8f9fa` background, `#ffffff` cards, Bootstrap-inspired text colors)
- Theme selector available in Client Settings
- Preference persisted in localStorage
- All 20+ components updated with theme-aware Tailwind classes
- Dark mode is now the default on first launch

### 💬 Message System Enhancements (0.5.5)

- **Message deletion** — hover a message to reveal the trash icon; soft-delete preserves the message as "Message deleted by: [username]"
- **Message editing** — inline pencil icon on hover; Enter to save, Escape to cancel; "(edited)" label shown next to timestamp
- **User profile modal** — click any username in messages or the member list to open a profile popup (avatar, role badge, join date; user ID visible to owners only)
- **Avatar in messages** — user avatars now correctly display next to all chat messages

### 🖥️ Local Server Management UI (0.5.7 / 0.5.11)

- **First-launch setup modal** — when starting the local server for the first time, a guided modal collects the admin password (with a Generate button) instead of silently generating a random one
- **Server Management modal** (gear icon → "Configure Server") with three tabs:
  - **Overview** — running/stopped status badge, data directory path
  - **Reset Password** — change admin password without wiping data
  - **Delete Data** — two-step confirmation (requires typing `DELETE`); requires server to be stopped first
- **Server process isolation** — server data now stored at `~/.nexum/server/data/` (no longer pollutes the client source tree)
- **Connection error feedback** — connecting to an offline server now opens the connection modal with a clear error message instead of failing silently
- **Improved dropdown** — running server shows "Stop Server" (red) + "Configure Server" (gear) instead of a single ambiguous button

### 🐛 Bug Fixes

| #   | Fix                                                                                                           | Commit    |
| --- | ------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | Blank screen when connecting to a server that doesn't send `categories` in WELCOME (old binary compatibility) | `c7274fe` |
| 2   | Connecting spinner now shows immediately on server card click                                                 | `0b8dc15` |
| 3   | Server rejected connections from the same IP (broke localhost multi-user)                                     | `bb9a653` |
| 4   | Username-taken error caused infinite reconnect loop; client now stops reconnect and surface the error         | `bb9a653` |
| 5   | `is_server_configured()` was checking the wrong path                                                          | `c457bad` |
| 6   | Stale `voice-server.exe` in `target/debug/` shadowed freshly rebuilt binary in dev mode                       | `ad507b0` |
| 7   | "Configure Server" button did nothing while server was running                                                | `7097a7e` |
| 8   | "Delete Data" allowed while server was still running, causing file lock errors                                | `19c2f4f` |

---

## 🔧 Technical Changes

### Protocol Extensions

```
CREATE_CHANNEL payload  → category_id? (optional UUID)
DELETE_MESSAGE / MESSAGE_DELETED
EDIT_MESSAGE / MESSAGE_EDITED
CREATE_CATEGORY / CATEGORY_CREATED
DELETE_CATEGORY / CATEGORY_DELETED
RENAME_CATEGORY / CATEGORY_RENAMED
MOVE_CHANNEL_TO_CATEGORY / CHANNEL_MOVED
```

### Database Schema

```sql
-- New table
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Modified table
ALTER TABLE channels ADD COLUMN category_id TEXT;

-- Message system
ALTER TABLE messages ADD COLUMN deleted_by_user_id TEXT;
ALTER TABLE messages ADD COLUMN deleted_at INTEGER;
ALTER TABLE messages ADD COLUMN edited_at INTEGER;
```

### New Components

- `UserProfileModal.tsx` — user info popup
- `LocalServerManageModal.tsx` — 3-tab server management panel
- `ThemeContext.tsx` + `useAppTheme` hook — full light/dark theme system

---

## ⚠️ Upgrade Notes

- The SQLite database schema has changed. The server will attempt to apply `CREATE TABLE IF NOT EXISTS` for new tables automatically. If upgrading from v0.1.0, the `categories` and new `messages` columns are added on first run.
- Server data path changed from **binary directory** to `~/.nexum/server/`. Existing users may need to move their `server.toml` and `data/` folder to the new location, or re-run first-launch setup.

---

## 🏗️ Build Info

| Component     | Build                                   |
| ------------- | --------------------------------------- |
| Client        | Tauri 2.0 + React 18 + TypeScript       |
| Server        | Rust (release, optimized)               |
| Platform      | Windows x64                             |
| Client bundle | `tsc` clean + Vite production build     |
| Server        | 5 warnings (unused code only), 0 errors |
