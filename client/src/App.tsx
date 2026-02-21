import { useState, useEffect } from 'react';
import { WebSocketClient } from './lib/websocket';
import { 
  Channel, 
  Message as ProtocolMessage, 
  ServerMessage, 
  UserRole 
} from './types/protocol';
import ConnectView from './components/ConnectView';
import MainView from './components/MainView';

const CLIENT_VERSION = '1.0.0';

export interface AppState {
  connected: boolean;
  connecting: boolean;
  sessionId: string | null;
  userId: string | null;
  username: string;
  role: UserRole | null;
  channels: Channel[];
  messages: Map<string, ProtocolMessage[]>;
  currentChannelId: string | null;
  error: string | null;
}

function App() {
  const [wsClient] = useState(() => new WebSocketClient());
  const [state, setState] = useState<AppState>({
    connected: false,
    connecting: false,
    sessionId: null,
    userId: null,
    username: '',
    role: null,
    channels: [],
    messages: new Map(),
    currentChannelId: null,
    error: null,
  });

  useEffect(() => {
    // Set up message handler
    const unsubscribe = wsClient.onMessage(handleServerMessage);

    // Set up status change handler
    wsClient.onStatusChange = (status) => {
      setState(prev => ({
        ...prev,
        connecting: status === 'connecting',
        connected: status === 'connected',
        error: status === 'error' ? 'Connection error' : null,
      }));
    };

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, [wsClient]);

  const handleServerMessage = (message: ServerMessage) => {
    console.log('Received:', message);

    switch (message.type) {
      case 'WELCOME':
        setState(prev => ({
          ...prev,
          connected: true,
          sessionId: message.payload.session_id,
          userId: message.payload.user_id,
          role: message.payload.role,
          channels: message.payload.channels,
          error: null,
        }));
        break;

      case 'ERROR':
        setState(prev => ({
          ...prev,
          error: message.payload.message,
        }));
        break;

      case 'CHANNEL_CREATED':
        setState(prev => ({
          ...prev,
          channels: [...prev.channels, message.payload.channel],
        }));
        break;

      case 'CHANNEL_DELETED':
        setState(prev => ({
          ...prev,
          channels: prev.channels.filter(ch => ch.id !== message.payload.channel_id),
          currentChannelId: prev.currentChannelId === message.payload.channel_id 
            ? null 
            : prev.currentChannelId,
        }));
        break;

      case 'MESSAGE':
        setState(prev => {
          const channelMessages = prev.messages.get(message.payload.message.channel_id) || [];
          const newMessages = new Map(prev.messages);
          newMessages.set(message.payload.message.channel_id, [
            ...channelMessages,
            message.payload.message,
          ]);
          return {
            ...prev,
            messages: newMessages,
          };
        });
        break;

      case 'USER_JOINED':
        console.log('User joined channel:', message.payload);
        break;

      case 'USER_LEFT':
        console.log('User left channel:', message.payload);
        break;

      case 'VOICE_JOINED':
        console.log('User joined voice:', message.payload);
        break;

      case 'VOICE_LEFT':
        console.log('User left voice:', message.payload);
        break;

      case 'PONG':
        // Handle pong
        break;

      default:
        console.warn('Unknown message type:', message);
    }
  };

  const handleConnect = async (serverAddress: string, username: string) => {
    setState(prev => ({ ...prev, error: null, connecting: true, username }));

    try {
      const wsUrl = `ws://${serverAddress}/ws`;
      await wsClient.connect(wsUrl);

      wsClient.send({
        type: 'CONNECT',
        payload: {
          username,
          client_version: CLIENT_VERSION,
        },
      });
    } catch (error) {
      console.error('Connection error:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to connect to server',
        connecting: false,
      }));
    }
  };

  const handleDisconnect = () => {
    wsClient.disconnect();
    setState({
      connected: false,
      connecting: false,
      sessionId: null,
      userId: null,
      username: '',
      role: null,
      channels: [],
      messages: new Map(),
      currentChannelId: null,
      error: null,
    });
  };

  const handleCreateChannel = (name: string, type: 'text' | 'voice') => {
    wsClient.send({
      type: 'CREATE_CHANNEL',
      payload: {
        name,
        channel_type: type,
      },
    });
  };

  const handleJoinChannel = (channelId: string) => {
    wsClient.send({
      type: 'JOIN_CHANNEL',
      payload: {
        channel_id: channelId,
      },
    });
    setState(prev => ({ ...prev, currentChannelId: channelId }));
  };

  const handleSendMessage = (content: string) => {
    if (!state.currentChannelId) return;

    wsClient.send({
      type: 'SEND_MESSAGE',
      payload: {
        channel_id: state.currentChannelId,
        content,
      },
    });
  };

  if (!state.connected) {
    return (
      <ConnectView
        onConnect={handleConnect}
        connecting={state.connecting}
        error={state.error}
      />
    );
  }

  return (
    <MainView
      state={state}
      onDisconnect={handleDisconnect}
      onCreateChannel={handleCreateChannel}
      onJoinChannel={handleJoinChannel}
      onSendMessage={handleSendMessage}
    />
  );
}

export default App;
