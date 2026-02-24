import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { WebSocketClient } from './lib/websocket'
import { ServerManager } from './lib/serverManager'
import { Channel, Message as ProtocolMessage, ServerMessage, UserRole, User, ServerSettingsPayload } from './types/protocol'
import { SavedServer, LocalServerStatus } from './types/server'
import ServerListView from './components/ServerListView'
import ServerConnectModal from './components/ServerConnectModal'
import AddServerModal from './components/AddServerModal'
import MainView from './components/MainView'
import AdminAuthModal from './components/AdminAuthModal'
import ServerSettingsModal from './components/ServerSettingsModal'
import UserListModal from './components/UserListModal'
import ClientSettingsModal from './components/ClientSettingsModal'
import ChangePasswordModal from './components/ChangePasswordModal'
import AvatarModal from './components/AvatarModal'
import UserSettingsModal from './components/UserSettingsModal'

const CLIENT_VERSION = '1.0.0'

export interface AppState {
  connected: boolean
  connecting: boolean
  sessionId: string | null
  userId: string | null
  username: string
  role: UserRole | null
  channels: Channel[]
  messages: Map<string, ProtocolMessage[]>
  currentChannelId: string | null
  error: string | null
}

interface ActiveConnection {
  server: SavedServer
  client: WebSocketClient
  connected: boolean
  connecting: boolean
  sessionId: string | null
  userId: string | null
  username: string
  role: UserRole | null
  serverName: string
  channels: Channel[]
  messages: Map<string, ProtocolMessage[]>
  currentChannelId: string | null
  error: string | null
  serverSettings: ServerSettingsPayload | null
  serverUsers: User[] | null
}

type AppView = { type: 'server-list' } | { type: 'connected'; connection: ActiveConnection }

function App() {
  const [view, setView] = useState<AppView>({ type: 'server-list' })
  const [servers, setServers] = useState<SavedServer[]>([])
  const [showAddServerModal, setShowAddServerModal] = useState(false)
  const [connectingServer, setConnectingServer] = useState<SavedServer | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false)
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null)
  const [showServerSettingsModal, setShowServerSettingsModal] = useState(false)
  const [showUserListModal, setShowUserListModal] = useState(false)
  const [clientSettingsSection, setClientSettingsSection] = useState<'general' | 'voice-video' | null>(null)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null)
  const [showUserSettingsModal, setShowUserSettingsModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [localServerStatus, setLocalServerStatus] = useState<LocalServerStatus>({
    installed: false,
    running: false,
  })

  // Load servers on mount
  useEffect(() => {
    setServers(ServerManager.loadServers())
    checkLocalServerStatus()
  }, [])

  const checkLocalServerStatus = async () => {
    try {
      const status = await invoke<LocalServerStatus>('check_server_installed')
      setLocalServerStatus(status)
    } catch (error) {
      console.error('Failed to check server status:', error)
    }
  }

  const handleAddServer = (address: string) => {
    ServerManager.addServer({
      name: address, // Temporary name, will be updated on connection
      address,
      isLocal: false,
    })
    setServers(ServerManager.loadServers())
  }

  const handleDeleteServer = (serverId: string) => {
    ServerManager.deleteServer(serverId)
    setServers(ServerManager.loadServers())
  }

  const handleSelectServer = (server: SavedServer) => {
    // Check if we have a saved user ID for this server
    if (server.lastUserId) {
      // Auto-connect without asking for username
      handleConnectWithUserId(server, server.lastUserId)
    } else {
      // Show modal to ask for username (new user)
      setConnectingServer(server)
    }
  }

  const handleCancelConnect = () => {
    setConnectingServer(null)
    setConnectionError(null)
  }

  const handleConnectWithUserId = async (server: SavedServer, userId: string) => {
    setIsConnecting(true)
    setConnectionError(null)

    const wsClient = new WebSocketClient()
    const wsUrl = `ws://${server.address}/ws`

    try {
      // Try to connect
      await wsClient.connect(wsUrl)

      // Connection successful
      const connection: ActiveConnection = {
        server,
        client: wsClient,
        connected: true,
        connecting: false,
        sessionId: null,
        userId: null,
        username: server.lastUsername || 'User',
        role: null,
        serverName: 'Connecting...',
        channels: [],
        messages: new Map(),
        currentChannelId: null,
        error: null,
        serverSettings: null,
        serverUsers: null,
      }

      // Set up handlers
      let hasReceivedWelcome = false
      wsClient.onMessage((message: ServerMessage) => {
        // Handle pre-auth errors (e.g., invalid user ID when resuming)
        if (message.type === 'ERROR' && !hasReceivedWelcome) {
          // Resume session failed - clear stored userId and fall back to username prompt
          ServerManager.updateServer(server.id, { lastUserId: undefined })

          // Reload the updated server from localStorage to get accurate data
          const updatedServer = ServerManager.getServer(server.id)

          wsClient.disconnect()
          setView({ type: 'server-list' })
          setConnectingServer(updatedServer || server)
          setConnectionError(message.payload.message)
          setIsConnecting(false)
          setServers(ServerManager.loadServers()) // Refresh server list
          return
        }
        if (message.type === 'WELCOME') {
          hasReceivedWelcome = true
          // Request user list after successful connection
          wsClient.send({ type: 'GET_USERS' })
        }
        // Handle admin auth errors specifically
        if (message.type === 'ERROR' && message.payload.code === 'UNAUTHORIZED' && showAdminAuthModal) {
          setAdminAuthError(message.payload.message)
          return
        }
        // Handle password change errors specifically
        if (message.type === 'ERROR' && showChangePasswordModal) {
          setPasswordChangeError(message.payload.message)
          return
        }
        setView(prev => {
          if (prev.type !== 'connected') return prev
          return {
            type: 'connected',
            connection: handleServerMessage(prev.connection, message),
          }
        })
      })

      wsClient.onStatusChange = status => {
        setView(prev => {
          if (prev.type !== 'connected') return prev
          return {
            type: 'connected',
            connection: {
              ...prev.connection,
              connecting: status === 'connecting',
              connected: status === 'connected',
              error: status === 'error' ? 'Connection lost' : prev.connection.error,
            },
          }
        })
      }

      // Send CONNECT message with resume_session_id (no username needed)
      wsClient.send({
        type: 'CONNECT',
        payload: {
          client_version: CLIENT_VERSION,
          resume_session_id: userId,
        },
      })

      // Change to connected view
      setView({ type: 'connected', connection })
      setIsConnecting(false)
    } catch (error) {
      console.error('Connection error:', error)
      setConnectionError(`Failed to connect to ${server.address}. Make sure the server is running.`)
      setIsConnecting(false)
    }
  }

  const handleConnect = async (username: string) => {
    if (!connectingServer) return

    setIsConnecting(true)
    setConnectionError(null)

    const wsClient = new WebSocketClient()
    const wsUrl = `ws://${connectingServer.address}/ws`

    try {
      // Try to connect - this will throw if connection fails
      await wsClient.connect(wsUrl)

      // Connection successful, now set up the handlers
      const connection: ActiveConnection = {
        server: connectingServer,
        client: wsClient,
        connected: true,
        connecting: false,
        sessionId: null,
        userId: null,
        username,
        role: null,
        serverName: 'Connecting...',
        channels: [],
        messages: new Map(),
        currentChannelId: null,
        error: null,
        serverSettings: null,
        serverUsers: null,
      }

      // Set up message handler
      wsClient.onMessage((message: ServerMessage) => {
        // Request user list after successful connection
        if (message.type === 'WELCOME') {
          wsClient.send({ type: 'GET_USERS' })
        }
        // Handle admin auth errors specifically
        if (message.type === 'ERROR' && message.payload.code === 'UNAUTHORIZED' && showAdminAuthModal) {
          setAdminAuthError(message.payload.message)
          return
        }
        // Handle password change errors specifically
        if (message.type === 'ERROR' && showChangePasswordModal) {
          setPasswordChangeError(message.payload.message)
          return
        }
        setView(prev => {
          if (prev.type !== 'connected') return prev
          return {
            type: 'connected',
            connection: handleServerMessage(prev.connection, message),
          }
        })
      })

      // Set up status change handler
      wsClient.onStatusChange = status => {
        setView(prev => {
          if (prev.type !== 'connected') return prev
          return {
            type: 'connected',
            connection: {
              ...prev.connection,
              connecting: status === 'connecting',
              connected: status === 'connected',
              error: status === 'error' ? 'Connection lost' : prev.connection.error,
            },
          }
        })
      }

      // Send CONNECT message (new user, no resume_session_id)
      wsClient.send({
        type: 'CONNECT',
        payload: {
          username,
          client_version: CLIENT_VERSION,
        },
      })

      // Save last username
      ServerManager.updateLastUsername(connectingServer.id, username)

      // Change to connected view
      setView({ type: 'connected', connection })
      setConnectingServer(null)
      setIsConnecting(false)
    } catch (error) {
      console.error('Connection error:', error)
      setConnectionError(`Failed to connect to ${connectingServer.address}. Make sure the server is running.`)
      setIsConnecting(false)
      // Don't change view - stay on the connection modal
    }
  }

  const handleServerMessage = (connection: ActiveConnection, message: ServerMessage): ActiveConnection => {
    console.log('Received:', message)

    switch (message.type) {
      case 'WELCOME':
        // Save user ID and username to localStorage for future reconnections
        if (connection.server) {
          ServerManager.updateLastUserId(connection.server.id, message.payload.user_id)
          ServerManager.updateLastUsername(connection.server.id, message.payload.username)
          // Update server name from server response
          ServerManager.updateServer(connection.server.id, { name: message.payload.server_name })
          setServers(ServerManager.loadServers()) // Refresh server list to show updated name
        }

        return {
          ...connection,
          connected: true,
          sessionId: message.payload.session_id,
          userId: message.payload.user_id,
          username: message.payload.username,
          role: message.payload.role,
          serverName: message.payload.server_name,
          channels: message.payload.channels,
          error: null,
        }

      case 'ERROR':
        return {
          ...connection,
          error: message.payload.message,
        }

      case 'CHANNEL_CREATED':
        return {
          ...connection,
          channels: [...connection.channels, message.payload.channel],
        }

      case 'CHANNEL_DELETED':
        return {
          ...connection,
          channels: connection.channels.filter(ch => ch.id !== message.payload.channel_id),
          currentChannelId: connection.currentChannelId === message.payload.channel_id ? null : connection.currentChannelId,
        }

      case 'CHANNEL_RENAMED':
        return {
          ...connection,
          channels: connection.channels.map(ch => (ch.id === message.payload.channel_id ? { ...ch, name: message.payload.new_name } : ch)),
        }

      case 'SERVER_SETTINGS':
        // If password change modal is open, close it on success
        if (showChangePasswordModal) {
          setShowChangePasswordModal(false)
          setPasswordChangeError(null)
        }
        return {
          ...connection,
          serverName: message.payload.name,
          serverSettings: message.payload,
        }

      case 'SERVER_USERS':
        return {
          ...connection,
          serverUsers: message.payload.users,
        }

      case 'MESSAGE':
        const channelMessages = connection.messages.get(message.payload.message.channel_id) || []
        const newMessages = new Map(connection.messages)
        // Extend message with username and avatar from payload
        const enrichedMessage = {
          ...message.payload.message,
          username: message.payload.username,
          avatar_url: message.payload.avatar_url,
          avatar_path: message.payload.avatar_path,
          avatar_version: message.payload.avatar_version,
        }
        newMessages.set(message.payload.message.channel_id, [...channelMessages, enrichedMessage])
        return {
          ...connection,
          messages: newMessages,
        }

      case 'MESSAGE_HISTORY':
        // Load historical messages when joining a channel
        const historyMessages = new Map(connection.messages)
        const enrichedHistory = message.payload.messages.map(mp => ({
          ...mp.message,
          username: mp.username,
          avatar_url: mp.avatar_url,
          avatar_path: mp.avatar_path,
          avatar_version: mp.avatar_version,
        }))
        historyMessages.set(message.payload.channel_id, enrichedHistory)
        return {
          ...connection,
          messages: historyMessages,
        }

      case 'MESSAGE_DELETED':
        // Mark message as deleted
        const deletedMessages = new Map(connection.messages)
        const channelMsgs = deletedMessages.get(message.payload.channel_id) || []
        const updatedMsgs = channelMsgs.map(msg =>
          msg.id === message.payload.message_id
            ? {
                ...msg,
                deleted_by_user_id: message.payload.deleted_by_user_id,
                deleted_by_username: message.payload.deleted_by_username,
                deleted_at: new Date().toISOString(),
              }
            : msg,
        )
        deletedMessages.set(message.payload.channel_id, updatedMsgs)
        return {
          ...connection,
          messages: deletedMessages,
        }

      case 'MESSAGE_EDITED':
        // Update message content and mark as edited
        const editedMessages = new Map(connection.messages)
        const channelEditMsgs = editedMessages.get(message.payload.channel_id) || []
        const updatedEditMsgs = channelEditMsgs.map(msg =>
          msg.id === message.payload.message_id
            ? {
                ...msg,
                content: message.payload.content,
                edited_at: message.payload.edited_at,
              }
            : msg,
        )
        editedMessages.set(message.payload.channel_id, updatedEditMsgs)
        return {
          ...connection,
          messages: editedMessages,
        }

      case 'ADMIN_AUTHENTICATED':
        // User authenticated as admin - close modal and clear error
        setShowAdminAuthModal(false)
        setAdminAuthError(null)
        return {
          ...connection,
          role: message.payload.new_role,
        }

      case 'USER_AVATAR_UPDATED':
        // Update avatar in user list if available
        const updatedUsers = connection.serverUsers?.map(u => (u.id === message.payload.user_id ? { ...u, avatar_url: message.payload.avatar_url ?? undefined } : u)) || null
        // After updating, force re-request to ensure sync
        if (message.payload.user_id === connection.userId) {
          // It's our avatar - request fresh user list
          setTimeout(() => {
            connection.client.send({ type: 'GET_USERS' })
          }, 100)
        }
        return {
          ...connection,
          serverUsers: updatedUsers,
        }

      case 'USER_UPDATED':
        // New avatar version notification - refresh user list to get updated data
        setTimeout(() => {
          connection.client.send({ type: 'GET_USERS' })
        }, 100)
        return connection

      case 'USER_JOINED':
      case 'USER_LEFT':
      case 'VOICE_JOINED':
      case 'VOICE_LEFT':
      case 'PONG':
        // Handle these silently for now
        return connection

      default:
        console.warn('Unknown message type:', message)
        return connection
    }
  }

  const handleDisconnect = () => {
    if (view.type === 'connected') {
      view.connection.client.disconnect()
    }
    // Clear admin authentication state
    setShowAdminAuthModal(false)
    setAdminAuthError(null)
    // Clear password change modal if open
    setShowChangePasswordModal(false)
    setPasswordChangeError(null)
    setView({ type: 'server-list' })
    // Reload servers from localStorage to get updated lastUserId/lastUsername
    setServers(ServerManager.loadServers())
  }

  const handleCreateChannel = (name: string, type: 'text' | 'voice') => {
    if (view.type !== 'connected') return

    view.connection.client.send({
      type: 'CREATE_CHANNEL',
      payload: {
        name,
        channel_type: type,
      },
    })
  }

  const handleJoinChannel = (channelId: string) => {
    if (view.type !== 'connected') return

    view.connection.client.send({
      type: 'JOIN_CHANNEL',
      payload: {
        channel_id: channelId,
      },
    })

    setView(prev => {
      if (prev.type !== 'connected') return prev
      return {
        type: 'connected',
        connection: {
          ...prev.connection,
          currentChannelId: channelId,
        },
      }
    })
  }

  const handleSendMessage = (content: string) => {
    if (view.type !== 'connected' || !view.connection.currentChannelId) return

    view.connection.client.send({
      type: 'SEND_MESSAGE',
      payload: {
        channel_id: view.connection.currentChannelId,
        content,
      },
    })
  }

  const handleDeleteMessage = (messageId: string) => {
    if (view.type !== 'connected') return

    view.connection.client.send({
      type: 'DELETE_MESSAGE',
      payload: {
        message_id: messageId,
      },
    })
  }

  const handleEditMessage = (messageId: string, content: string) => {
    if (view.type !== 'connected') return

    view.connection.client.send({
      type: 'EDIT_MESSAGE',
      payload: {
        message_id: messageId,
        content,
      },
    })
  }

  const handleAuthenticateAdmin = (password: string) => {
    if (view.type !== 'connected') return

    view.connection.client.send({
      type: 'AUTHENTICATE_ADMIN',
      payload: {
        password,
      },
    })
  }

  const handleDeleteChannel = (channelId: string) => {
    if (view.type !== 'connected') return

    view.connection.client.send({
      type: 'DELETE_CHANNEL',
      payload: { channel_id: channelId },
    })
  }

  const handleRenameChannel = (channelId: string, newName: string) => {
    if (view.type !== 'connected') return

    view.connection.client.send({
      type: 'RENAME_CHANNEL',
      payload: { channel_id: channelId, new_name: newName },
    })
  }

  const handleGetServerSettings = () => {
    if (view.type !== 'connected') return

    view.connection.client.send({ type: 'GET_SERVER_SETTINGS' })
    setShowServerSettingsModal(true)
  }

  const handleUpdateServerSettings = (settings: { name?: string; max_users?: number; max_users_per_voice_channel?: number; max_message_size?: number }) => {
    if (view.type !== 'connected') return

    view.connection.client.send({
      type: 'UPDATE_SERVER_SETTINGS',
      payload: settings,
    })
  }

  const handleChangePassword = (currentPassword: string, newPassword: string) => {
    if (view.type !== 'connected') return

    setPasswordChangeError(null)

    view.connection.client.send({
      type: 'UPDATE_SERVER_SETTINGS',
      payload: {
        current_admin_password: currentPassword,
        admin_password: newPassword,
      },
    })

    // Close modal on success (will be handled when SERVER_SETTINGS arrives without error)
    setTimeout(() => {
      if (!passwordChangeError) {
        setShowChangePasswordModal(false)
      }
    }, 500)
  }

  const handleGetUsers = () => {
    if (view.type !== 'connected') return

    view.connection.client.send({ type: 'GET_USERS' })
    setShowUserListModal(true)
  }

  const handleLaunchLocalServer = async () => {
    if (!localServerStatus.installed) {
      // Open download page
      try {
        await invoke('open_server_download_page')
      } catch (error) {
        console.error('Failed to open download page:', error)
        alert('Please download the server from the releases page')
      }
      return
    }

    if (localServerStatus.binaryPath) {
      try {
        const result = await invoke<string>('launch_local_server', {
          binaryPath: localServerStatus.binaryPath,
        })
        console.log(result)

        // Add local server to list if not already there
        const existingLocal = servers.find(s => s.isLocal)
        if (!existingLocal) {
          ServerManager.addServer({
            name: 'My Local Server',
            address: `localhost:${localServerStatus.port || 8080}`,
            isLocal: true,
          })
          setServers(ServerManager.loadServers())
        }

        // Update status
        setLocalServerStatus(prev => ({ ...prev, running: true }))
        alert('Server launched successfully!')
      } catch (error) {
        console.error('Failed to launch server:', error)
        alert(`Failed to launch server: ${error}`)
      }
    }
  }

  const handleUpdateAvatar = (avatarUrl: string | null) => {
    if (view.type !== 'connected') return

    view.connection.client.send({
      type: 'UPDATE_AVATAR',
      payload: {
        avatar_url: avatarUrl,
      },
    })
  }

  // Render based on current view
  if (view.type === 'server-list') {
    return (
      <>
        <ServerListView
          servers={servers}
          onSelectServer={handleSelectServer}
          onAddServer={() => setShowAddServerModal(true)}
          onDeleteServer={handleDeleteServer}
          onLaunchLocalServer={handleLaunchLocalServer}
          onOpenClientSettings={section => setClientSettingsSection(section)}
          localServerStatus={localServerStatus}
        />

        {showAddServerModal && <AddServerModal onClose={() => setShowAddServerModal(false)} onAdd={handleAddServer} />}

        {connectingServer && (
          <ServerConnectModal
            serverName={connectingServer.name}
            serverAddress={connectingServer.address}
            lastUsername={connectingServer.lastUsername}
            onConnect={handleConnect}
            onCancel={handleCancelConnect}
            connecting={isConnecting}
            error={connectionError}
          />
        )}

        {clientSettingsSection && <ClientSettingsModal initialSection={clientSettingsSection} onClose={() => setClientSettingsSection(null)} />}
      </>
    )
  }

  // Connected view
  const conn = view.connection
  // Get current user avatar from user list
  const currentUser = conn.serverUsers?.find(u => u.id === conn.userId)

  // Construct avatar URL from avatar_path or use avatar_url
  const currentUserAvatar = currentUser?.avatar_url || (currentUser?.avatar_path ? `http://${conn.server.address}/${currentUser.avatar_path}` : null)

  return (
    <>
      <MainView
        state={{
          connected: conn.connected,
          connecting: conn.connecting,
          sessionId: conn.sessionId,
          userId: conn.userId,
          username: conn.username,
          role: conn.role,
          channels: conn.channels,
          messages: conn.messages,
          currentChannelId: conn.currentChannelId,
          error: conn.error,
        }}
        serverName={conn.serverName}
        serverAddress={conn.server.address}
        currentUserAvatar={currentUserAvatar}
        serverUsers={conn.serverUsers}
        onDisconnect={handleDisconnect}
        onCreateChannel={handleCreateChannel}
        onJoinChannel={handleJoinChannel}
        onSendMessage={handleSendMessage}
        onDeleteMessage={handleDeleteMessage}
        onEditMessage={handleEditMessage}
        onAuthenticateAdmin={() => setShowAdminAuthModal(true)}
        onOpenServerSettings={handleGetServerSettings}
        onOpenClientSettings={section => setClientSettingsSection(section)}
        onRenameChannel={handleRenameChannel}
        onDeleteChannel={handleDeleteChannel}
        onViewUsers={handleGetUsers}
        onOpenUserSettings={() => setShowUserSettingsModal(true)}
      />

      {showAdminAuthModal && (
        <AdminAuthModal
          onClose={() => {
            setShowAdminAuthModal(false)
            setAdminAuthError(null)
          }}
          onAuthenticate={handleAuthenticateAdmin}
          error={adminAuthError}
        />
      )}

      {showServerSettingsModal && (
        <ServerSettingsModal
          serverName={conn.server.name}
          settings={conn.serverSettings}
          onClose={() => setShowServerSettingsModal(false)}
          onSave={handleUpdateServerSettings}
          onChangePassword={() => setShowChangePasswordModal(true)}
        />
      )}

      {showUserListModal && <UserListModal users={conn.serverUsers} onClose={() => setShowUserListModal(false)} />}

      {clientSettingsSection && <ClientSettingsModal initialSection={clientSettingsSection} onClose={() => setClientSettingsSection(null)} />}

      {showChangePasswordModal && (
        <ChangePasswordModal
          onClose={() => {
            setShowChangePasswordModal(false)
            setPasswordChangeError(null)
          }}
          onSave={handleChangePassword}
          error={passwordChangeError}
        />
      )}

      {showUserSettingsModal && <UserSettingsModal onClose={() => setShowUserSettingsModal(false)} onChangeAvatar={() => setShowAvatarModal(true)} />}

      {showAvatarModal && conn.sessionId && conn.userId && (
        <AvatarModal currentAvatar={currentUserAvatar} serverAddress={conn.server.address} sessionId={conn.sessionId} userId={conn.userId} onClose={() => setShowAvatarModal(false)} onSave={handleUpdateAvatar} />
      )}
    </>
  )
}

export default App
