# Voice Server

Self-hosted voice and chat server.

## 🚀 Quick Start

### First Time Setup

1. **Download the server binary** from the releases page
2. **Run the server**:

   ```bash
   ./voice-server  # Linux/macOS
   voice-server.exe  # Windows
   ```

3. **On first launch**, the server will:
   - Generate a secure random **admin password**
   - Display it prominently in the console
   - Create a `server.toml` configuration file

4. **Copy the admin password** and keep it safe!

### Example First Launch Output

```
======================================================================
🔐 SERVER FIRST-TIME SETUP
======================================================================

A new configuration file has been created: server.toml

⚠️  IMPORTANT: Your Admin Password (keep this secure!)

    K7m9nP2xR4qW8vL5

This password is required to authenticate as admin from the client.
Share it only with trusted administrators.

To change the password, edit 'server.toml' and restart the server.
======================================================================
```

## 🔐 Admin Authentication

**Default Behavior:**

- All users connect as **members** by default
- No automatic owner/admin assignments
- To become admin, authenticate with the password

**From the Client:**

1. Connect to the server as a member
2. Click "🔒 Authenticate as Admin" button
3. Enter the admin password shown during server setup
4. You're now an owner with full permissions!

## ⚙️ Configuration

The `server.toml` file contains all server settings:

```toml
[server]
name = "My Voice Server"
host = "0.0.0.0"
ws_port = 8080
udp_port = 9000
data_path = "./data"
session_timeout_secs = 60
ping_interval_secs = 30
admin_password = "K7m9nP2xR4qW8vL5"  # Change this!

[limits]
max_users = 200
max_users_per_voice_channel = 100
max_message_size = 2000
rate_limit_messages_per_minute = 60

[persistence]
enabled = true
```

### Changing the Admin Password

1. Stop the server
2. Edit `server.toml`
3. Change the `admin_password` value
4. Restart the server
5. Share the new password with your admins

## 📂 Data Storage

The server stores all data in the `./data` directory:

- `nexum.db` - SQLite database with users, channels, messages
- Other server data

## 🌐 Networking

**Default Ports:**

- WebSocket: `8080`
- UDP (voice): `9000`

**To access from other devices:**

1. Find your server's IP address
2. Clients connect to: `your-ip:8080`
3. Make sure your firewall allows these ports

## 🛡️ Security Notes

- ⚠️ The admin password is stored in **plain text** in `server.toml`
- ⚠️ Traffic is **not encrypted** (use a VPN for remote access)
- ⚠️ Only share the admin password with trusted users
- ✅ Each user gets a unique UUID for persistent identity
- ✅ Roles persist across reconnections

## 🔧 Advanced Usage

### Custom Config Path

Set the `CONFIG_PATH` environment variable:

```bash
CONFIG_PATH=/path/to/custom.toml ./voice-server
```

### Running as a Service

**On Linux (systemd):**

Create `/etc/systemd/system/voice-server.service`:

```ini
[Unit]
Description=Voice Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/server
ExecStart=/path/to/voice-server
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl enable voice-server
sudo systemctl start voice-server
```

**On Windows:**

Use `nssm` (Non-Sucking Service Manager) or Task Scheduler.

## 📝 Logging

The server uses `tracing` for logging. Set the log level with the `RUST_LOG` environment variable:

```bash
RUST_LOG=debug ./voice-server    # Debug mode
RUST_LOG=info ./voice-server     # Info mode (default)
RUST_LOG=warn ./voice-server     # Warnings only
```

## 🐛 Troubleshooting

### Server won't start

- Check if ports 8080 and 9000 are available
- Verify file permissions for the data directory
- Check logs for error messages

### Can't connect from client

- Verify server is running
- Check firewall settings
- Ensure correct IP address and port
- Try connecting from localhost first

### Lost admin password

1. Stop the server
2. Delete `server.toml`
3. Restart the server (generates new password)
4. **Note:** This won't affect existing users, channels, or messages

## 📚 More Information

- [User Flow Documentation](../USER_FLOW.md)
- [Architecture Specification](../architecture_spec.md)
- [Client Usage Guide](../quickstart.md)

## 📄 License

MIT License - See LICENSE file for details
