# TODO List - Nexum

## 🚧 Phase 0.5: Client-Server Integration (IN PROGRESS)

**Priority: HIGH - Current Focus**

This phase integrates the CLI server with the client for a unified user experience.

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

### 0.5.8 Remove Redundant "View Users" Button ⏳

**Priority: LOW - UI Cleanup**

#### Problem
After implementing the right sidebar user list in 0.5.2, the "View Users" button in the admin dropdown is now redundant. All users (not just admins) can see the server members in the right panel.

#### Tasks

- [ ] **Remove "View Users" from admin dropdown** — Clean up duplicate functionality
  - Remove "View Users" button from dropdown menu
  - Remove UserListModal component (or keep for future use)
  - Remove onViewUsers prop chain (App → MainView)
  - Remove GET_USERS handler call from "View Users" button
  - Update documentation to reflect UI changes

**Technical Implementation:**
- `MainView.tsx` - Remove "View Users" dropdown option
- `App.tsx` - Remove handleGetUsers function and modal state
- Clean up unused imports and props

### 0.5.9 Channel Categories & Organization 🚧

**Priority: MEDIUM - Feature Enhancement**

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

- [ ] **Database schema update** — Add category support
  - Add `category_id` (optional) to channels table
  - Create `categories` table: `id`, `name`, `position`, `created_at`
  - Add `category_position` to channels for ordering within category
  - Migration script for existing channels (all uncategorized initially)

- [ ] **Backend protocol changes** — Category CRUD operations
  - Add `CREATE_CATEGORY` client message
  - Add `DELETE_CATEGORY` client message
  - Add `RENAME_CATEGORY` client message
  - Add `MOVE_CHANNEL_TO_CATEGORY` client message
  - Add corresponding server broadcast messages
  - Update `WELCOME` payload to include categories

- [ ] **Frontend UI implementation** — Category display and interaction
  - Update ChannelList to render categories with channels inside
  - Add collapse/expand icon (chevron) next to category name
  - Store collapsed state per category in localStorage
  - Add "Create Category" button for owners
  - Add category context menu (rename, delete for owners)
  - Update channel creation modal to allow category selection

- [ ] **Category management** — Admin controls
  - Right-click category to rename or delete
  - Drag-drop channels between categories
  - Delete category moves channels to uncategorized
  - Channels without category_id render in "Uncategorized" section

**Technical Implementation:**

**Backend (Server):**
```rust
// models.rs
pub struct Category {
    pub id: Uuid,
    pub name: String,
    pub position: i32,
    pub created_at: DateTime<Utc>,
}

// ClientMessage enum additions
CreateCategory(CreateCategoryPayload),
DeleteCategory(DeleteCategoryPayload),
RenameCategory(RenameCategoryPayload),
MoveChannelToCategory(MoveChannelPayload),
```

**Frontend (Client):**
```tsx
// ChannelList.tsx
- Render categories with collapsible sections
- Show uncategorized channels at bottom
- Category create/edit modals

// localStorage
- Store collapsed categories: { categoryId: boolean }
```

**User Experience:**
- Collapsed categories show channel count badge
- Drag-drop visual feedback
- Smooth expand/collapse animations
- Preserve scroll position when toggling categories

### 0.5.10 Auto-start on System Boot 🚧

**Priority: LOW - User Convenience**

#### Problem
Users must manually launch the app every time they restart their computer. Power users want the app to start automatically when Windows boots.

#### Proposed Solution
Add a toggle in Client Settings that enables/disables auto-start functionality using Windows startup registry keys or startup folder shortcuts.

#### Tasks

- [ ] **Backend implementation** — Tauri commands for auto-start
  - Create `enable_auto_start()` Tauri command
  - Create `disable_auto_start()` Tauri command
  - Create `is_auto_start_enabled()` Tauri command
  - Use `auto-launch` crate or Windows registry API
  - Handle Windows startup folder shortcut creation
  - Test on Windows 10 and Windows 11

- [ ] **Frontend implementation** — Settings UI toggle
  - Add "Launch on system startup" toggle to General settings tab
  - Load current auto-start status when settings open
  - Call enable/disable commands when toggled
  - Show error message if operation fails (permissions)
  - Persist toggle state visually (don't rely on localStorage)

- [ ] **Error handling** — Permission and edge cases
  - Handle UAC/permission errors gracefully
  - Show informative error messages to user
  - Test behavior with portable installation
  - Test uninstall cleanup (remove startup entry)

**Technical Implementation:**

**Backend (Tauri):**
```rust
// Add to Cargo.toml
[dependencies]
auto-launch = "0.5"

// main.rs
#[tauri::command]
async fn enable_auto_start(app_handle: tauri::AppHandle) -> Result<(), String> {
    // Implementation using auto-launch crate
}

#[tauri::command]
async fn disable_auto_start() -> Result<(), String> {
    // Remove from Windows startup
}

#[tauri::command]
async fn is_auto_start_enabled() -> Result<bool, String> {
    // Check registry/startup folder
}
```

**Frontend (React):**
```tsx
// ClientSettingsModal.tsx - General tab
const [autoStart, setAutoStart] = useState(false)

useEffect(() => {
  invoke('is_auto_start_enabled').then(setAutoStart)
}, [])

const handleAutoStartToggle = async () => {
  try {
    if (autoStart) {
      await invoke('disable_auto_start')
    } else {
      await invoke('enable_auto_start')
    }
    setAutoStart(!autoStart)
  } catch (error) {
    alert('Failed to change auto-start setting')
  }
}
```

**Testing:**
- Enable auto-start and reboot to verify
- Disable and reboot to verify removal
- Test with non-admin user account
- Test portable vs installed versions
- Verify cleanup on uninstall

### Future: Private Messaging & Encryption

- [ ] Add private message functionality (click user in sidebar to DM)
- [ ] Implement end-to-end encryption for private messages
- [ ] Add encryption indicator in private chat UI

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
- [ ] "Connect to Local" quick button after server starts

### 0.5.6 Auto-Connection 🚧

- [ ] Auto-fill `localhost:8080` on server start (✅ basic version done)
- [ ] Auto-trigger Connect after server starts with saved username
- [ ] Handle connection failures gracefully
- [ ] Add retry logic with exponential backoff

### 0.5.7 Configuration Management 🚧

- [ ] Add "Local Server Settings" to Settings modal
  - [ ] Change admin password
  - [ ] Change server ports (WS / UDP)
  - [ ] Toggle auto-start on client launch
  - [ ] View last server log lines
- [ ] Implement config file editing from client
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
- [ ] Kick actions (deferred to future)

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

- [ ] Cross-compile for Windows x64
- [ ] Cross-compile for macOS (Intel + ARM)
- [ ] Test binary standalone
- [x] Create default config structure (creates server.example.toml)

### 5.2 Client Bundling (DEFERRED)

- [ ] Embed server binary in Tauri resources
- [ ] Implement "Start Local Server" button
- [ ] Spawn server process from client
- [ ] Display server logs in UI (optional)
- [ ] Handle server process lifecycle

**Decisions:**

- Defer server embedding for MVP
- Focus on standalone client installer first

### 5.3 Installers ✅ **LINUX COMPLETE, WINDOWS DOCUMENTED**

- [x] 🎯 **Verify client compiles successfully**
- [x] 🎯 **Create app icons (PNG, ICO, ICNS)** - Generated via Tauri CLI from SVG
- [x] 🎯 **Configure bundle metadata in tauri.conf.json**
- [x] 🎯 **Build Linux bundles with Tauri** - Generated `.deb`, `.rpm`, `.AppImage`
- [ ] 🎯 **Build Windows .msi with Tauri** - Requires compilation on Windows (see [windows_build_guide.md](windows_build_guide.md))
- [ ] 🎯 **Test installation on Windows** - Pending Windows build
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
