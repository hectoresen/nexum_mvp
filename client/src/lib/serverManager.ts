// Server management - CRUD operations for saved servers

import { SavedServer } from '../types/server';

const STORAGE_KEY = 'nexum_servers';

export class ServerManager {
  /**
   * Load all saved servers from localStorage
   */
  static loadServers(): SavedServer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];

      const servers = JSON.parse(data);
      return Array.isArray(servers) ? servers : [];
    } catch (error) {
      console.error('Failed to load servers:', error);
      return [];
    }
  }

  /**
   * Save servers to localStorage
   */
  static saveServers(servers: SavedServer[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
    } catch (error) {
      console.error('Failed to save servers:', error);
    }
  }

  /**
   * Add a new server
   */
  static addServer(server: Omit<SavedServer, 'id' | 'createdAt'>): SavedServer {
    const servers = this.loadServers();

    const newServer: SavedServer = {
      ...server,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    servers.push(newServer);
    this.saveServers(servers);

    return newServer;
  }

  /**
   * Update an existing server
   */
  static updateServer(id: string, updates: Partial<SavedServer>): SavedServer | null {
    const servers = this.loadServers();
    const index = servers.findIndex(s => s.id === id);

    if (index === -1) return null;

    servers[index] = { ...servers[index], ...updates };
    this.saveServers(servers);

    return servers[index];
  }

  /**
   * Delete a server
   */
  static deleteServer(id: string): boolean {
    const servers = this.loadServers();
    const filtered = servers.filter(s => s.id !== id);

    if (filtered.length === servers.length) return false;

    this.saveServers(filtered);
    return true;
  }

  /**
   * Get a server by ID
   */
  static getServer(id: string): SavedServer | null {
    const servers = this.loadServers();
    return servers.find(s => s.id === id) || null;
  }

  /**
   * Update last username for a server
   */
  static updateLastUsername(id: string, username: string): void {
    this.updateServer(id, { lastUsername: username });
  }

  /**
   * Update last user ID for a server (for resuming sessions)
   */
  static updateLastUserId(id: string, userId: string): void {
    this.updateServer(id, { lastUserId: userId });
  }
}
