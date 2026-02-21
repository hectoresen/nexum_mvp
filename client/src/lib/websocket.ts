import { ClientMessage, ServerMessage } from '../types/protocol';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type MessageHandler = (message: ServerMessage) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private shouldReconnect = true;
  private serverUrl: string = '';
  
  public status: ConnectionStatus = 'disconnected';
  public onStatusChange?: (status: ConnectionStatus) => void;

  connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.serverUrl = serverUrl;
      this.shouldReconnect = true;
      this.setStatus('connecting');

      try {
        this.ws = new WebSocket(serverUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.setStatus('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: ServerMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.setStatus('error');
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.setStatus('disconnected');
          
          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
            
            setTimeout(() => {
              this.connect(this.serverUrl).catch(console.error);
            }, this.reconnectDelay);

            // Exponential backoff
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000);
          }
        };
      } catch (error) {
        this.setStatus('error');
        reject(error);
      }
    });
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  send(message: ClientMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const json = JSON.stringify(message);
    this.ws.send(json);
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  private handleMessage(message: ServerMessage) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.onStatusChange?.(status);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
