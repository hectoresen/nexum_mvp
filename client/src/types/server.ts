// Types for saved server management

export interface SavedServer {
  id: string; // UUID for local identification
  name: string; // User-defined name (e.g., "My Server", "Gaming")
  address: string; // host:port (e.g., "localhost:8080", "192.168.1.10:8080")
  isLocal: boolean; // True if this is a local server managed by this client
  lastUsername?: string; // Last username used to connect (optional)
  lastUserId?: string; // Last user ID from server (for resuming session)
  createdAt: number; // Timestamp
}

export interface ServerConnection {
  server: SavedServer;
  connected: boolean;
  connecting: boolean;
  sessionId: string | null;
  userId: string | null;
  username: string;
  role: 'owner' | 'member' | null;
  error: string | null;
}

export interface LocalServerStatus {
  installed: boolean;
  running: boolean;
  binaryPath?: string;
  port?: number;
}
