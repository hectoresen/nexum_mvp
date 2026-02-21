# Voice MVP - Architecture Specification

Documento formal cerrado versión 0.5.

**Note:** This is the original architectural specification. For the main project README, see [readme.md](readme.md).

---

# Minimal Self-Hosted Voice & Chat

## MVP Architecture Specification — v0.5

---

# 1. Vision

A minimal, elegant, self-hosted voice and text communication system.

Core principles:

* No mandatory central infrastructure
* No accounts
* No cloud storage
* No external data routing
* User-controlled servers
* Lightweight and efficient
* Clean UX for Windows and macOS

The product consists of:

* A standalone Rust server binary
* A desktop client (Tauri + TypeScript)

Servers are fully self-hosted.
All data lives on the host machine.
No message or voice traffic passes through external infrastructure.

---

# 2. High-Level Architecture

## Components

### Server (Rust)

* Independent binary
* Self-hosted
* Launchable manually or from client
* WebSocket (control)
* UDP (voice)
* SQLite persistence (local)

### Client (Tauri + TypeScript)

* Cross-platform desktop app
* Connects to remote servers
* Can spawn and manage local server process
* Handles UI and audio mixing

---

# 3. Hosting Model

* Server runs independently from client
* Client can spawn server as child process
* Server persists independently of client lifecycle
* If client closes, server can remain running

Server data location (default):

```
~/AppName/servers/<serverId>/
```

---

# 4. Data Ownership

All data is stored:

* On the host machine
* Inside the server’s local SQLite database

If host deletes data directory → all data is lost.

We do not:

* Store user data
* Proxy traffic
* Record voice
* Route messages through external services

---

# 5. Identity Model

Each server manages identity locally.

## User Identity

* Each user gets:

  * `userId` (UUID, persistent per server)
  * `username` (editable display name)

Identity rules:

* `userId` is authoritative
* `username` can change
* Multiple users may share same username
* Identity is server-scoped

No global accounts.

---

# 6. Roles (MVP)

Two roles only:

* `owner`
* `member`

Owner permissions:

* Create/delete channels
* Kick users
* Modify server configuration

Members:

* Join channels
* Send messages
* Participate in voice

---

# 7. Persistence Model

Persistence is enabled by default.

Config example:

```json
{
  "persistenceEnabled": true,
  "dataPath": "./data"
}
```

If disabled:

* Server runs fully in memory
* All data lost on shutdown

---

# 8. Database Schema (MVP)

## users

* id (uuid, primary key)
* username (text)
* role (owner | member)
* created_at (timestamp)

## channels

* id (uuid)
* name (text)
* type (text | voice)
* max_users (integer)
* created_at (timestamp)

## messages

* id (uuid)
* channel_id (uuid)
* user_id (uuid)
* content (text, max 2000 chars)
* created_at (timestamp)

## call_history

* id (uuid)
* channel_id (uuid)
* started_at (timestamp)
* ended_at (timestamp)
* duration_seconds (integer)

## server_config

* id (uuid)
* max_users (integer)
* persistence_enabled (boolean)
* created_at (timestamp)

Sessions are in memory only.

---

# 9. Communication Protocol

## 9.1 Control Channel

Transport:

* WebSocket
* JSON payload
* Versioned protocol

### Handshake

Client → Server:

```json
{
  "type": "CONNECT",
  "payload": {
    "username": "string",
    "clientVersion": "1.0.0",
    "resumeSessionId": "optional"
  }
}
```

Server → Client (success):

```json
{
  "type": "WELCOME",
  "payload": {
    "sessionId": "uuid",
    "serverVersion": "1.0.0",
    "role": "owner | member"
  }
}
```

Error:

```json
{
  "type": "ERROR",
  "payload": {
    "code": "VERSION_MISMATCH | SERVER_FULL | INVALID_PAYLOAD"
  }
}
```

Major version must match.

---

## 9.2 Voice Channel

Transport:

* UDP
* Opus codec
* No server-side mixing

Packet structure:

```
[1 byte] protocol version
[16 bytes] sessionId (UUID)
[variable] opus encoded frame
```

Server behavior:

* Receives packet
* Identifies session
* Detects channel
* Forwards to channel members
* No ACK
* No retransmission

Clients mix audio locally.

---

# 10. Limits (Configurable)

Default configuration:

```json
{
  "maxUsers": 200,
  "maxUsersPerVoiceChannel": 100,
  "maxMessageSize": 2000
}
```

Server host assumes responsibility for resource capacity.

---

# 11. Security Model (MVP)

* Strict payload validation
* Rate limiting (messages)
* Message size limits
* No dynamic code execution
* No external dependencies for runtime logic

TLS:

* Not required in MVP
* Recommended via reverse proxy for internet exposure

---

# 12. Server Runtime Stack

Rust ecosystem:

* Tokio (async runtime)
* Axum or Actix (WebSocket)
* Tokio UDP sockets
* SQLite
* Serde (serialization)
* Tracing (structured logs)

Goals:

* <100MB RAM
* Low idle CPU
* Stable at 50–100 concurrent users

---

# 13. Client Stack

* Tauri
* TypeScript
* React
* Tailwind
* Native audio APIs
* Opus encoder/decoder

UI goals:

* Minimal
* Clean
* Dark modern aesthetic
* Zero friction onboarding

---

# 14. User Flow (MVP)

1. Download app
2. Enter username
3. Choose:

   * Create server
   * Join server
4. Connect
5. Communicate

No login.
No account.
No email.
No central identity.

---

# 15. Reconnections

* Automatic reconnect attempts
* `resumeSessionId` supported
* Session timeout (e.g. 60 seconds)
* If expired → new session created

---

# 16. Roadmap (MVP Phases)

## Phase 1 — Server Core

* Config loader
* WebSocket server
* UDP voice handler
* SQLite initialization

## Phase 2 — Domain Logic

* Users
* Channels
* Messaging
* Role enforcement

## Phase 3 — Voice Integration

* Opus encode/decode
* UDP forwarding
* Channel membership tracking

## Phase 4 — Client

* UI layout
* WebSocket client
* UDP client
* Voice mixing

## Phase 5 — Packaging

* Windows build
* macOS build
* Embedded server binary
* Installer

---

# 17. Non-Goals (MVP)

* No global user accounts
* No cloud relay
* No media file uploads
* No message editing
* No granular permissions
* No message reactions
* No bot framework

---

# 18. Product Positioning

This is:

* A minimal self-hosted alternative to

  * TeamSpeak
  * Mumble
  * Discord

But:

* With zero vendor lock-in
* No central dependency
* Lightweight modern UX
* Fully user-controlled infrastructure

---

# 19. Version

Specification Version: 0.5
Status: Architecturally Frozen for MVP Implementation

---
