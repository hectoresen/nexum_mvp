import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { WebSocketClient } from './lib/websocket'
import { ServerManager } from './lib/serverManager'
import { Channel, Message as ProtocolMessage, ServerMessage, UserRole, User, ServerSettingsPayload, Category } from './types/protocol'
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
  categories: Category[]
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
  const [showLocalServerSetupModal, setShowLocalServerSetupModal] = useState(false)
  const [localSetupPassword, setLocalSetupPassword] = useState('')
  const [localSetupError, setLocalSetupError] = useState<string | null>(null)
  const [localSetupLaunching, setLocalSetupLaunching] = useState(false)
  const [showLocalServerManageModal, setShowLocalServerManageModal] = useState(false)
  const [manageModalTab, setManageModalTab] = useState<'overview' | 'reset-password' | 'delete-data'>('overview')
  const [manageResetPassword, setManageResetPassword] = useState('')
  const [manageResetError, setManageResetError] = useState<string | null>(null)
  const [manageResetLoading, setManageResetLoading] = useState(false)
  const [manageDeleteConfirm, setManageDeleteConfirm] = useState(false)
  const [manageDeleteLoading, setManageDeleteLoading] = useState(false)
  const [manageDeleteText, setManageDeleteText] = useState('')
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
      const status = await invoke<any>('detect_local_server')
      setLocalServerStatus({
        installed: status.installed,
        running: status.status === 'running',
        binaryPath: status.binary_path,
        port: status.ws_port,
      })
    } catch (error) {
      console.error('Failed to check server status:', error)
      setLocalServerStatus({
        installed: false,
        running: false,
      })
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
    // Open the modal immediately so the user sees the connecting spinner right away
    setConnectingServer(server)
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
        categories: [],
        messages: new Map(),
        currentChannelId: null,
        error: null,
        serverSettings: null,
        serverUsers: null,
      }

      // Set up handlers
      let hasReceivedWelcome = false
      wsClient.onMessage((message: ServerMessage) => {
        // Handle pre-auth errors (e.g., invalid user ID when resuming, username taken)
        if (message.type === 'ERROR' && !hasReceivedWelcome) {
          // Disable auto-reconnect to prevent repeated failed attempts
          wsClient.shouldReconnect = false

          // Clear stored userId if resume failed
          if (message.payload.code === 'INVALID_REQUEST' || message.payload.code === 'INVALID_PAYLOAD') {
            ServerManager.updateServer(server.id, { lastUserId: undefined })
          }

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
      setConnectingServer(null)
      setView({ type: 'connected', connection })
      setIsConnecting(false)
    } catch (error) {
      console.error('Connection error:', error)
      // Modal is already open (set at function start); just update the error
      setConnectionError(`Could not reach ${server.address}. Make sure the server is running.`)
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
        categories: [],
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
          categories: message.payload.categories,
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

      case 'CATEGORY_CREATED':
        return {
          ...connection,
          categories: [...connection.categories, message.payload.category],
        }

      case 'CATEGORY_DELETED':
        return {
          ...connection,
          categories: connection.categories.filter(c => c.id !== message.payload.category_id),
          // Unassign channels that were in this category
          channels: connection.channels.map(ch => (ch.category_id === message.payload.category_id ? { ...ch, category_id: undefined } : ch)),
        }

      case 'CATEGORY_RENAMED':
        return {
          ...connection,
          categories: connection.categories.map(c => (c.id === message.payload.category_id ? { ...c, name: message.payload.new_name } : c)),
        }

      case 'CHANNEL_MOVED':
        return {
          ...connection,
          channels: connection.channels.map(ch => (ch.id === message.payload.channel_id ? { ...ch, category_id: message.payload.category_id ?? undefined } : ch)),
        }

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

  const handleCreateCategory = (name: string) => {
    if (view.type !== 'connected') return
    view.connection.client.send({
      type: 'CREATE_CATEGORY',
      payload: { name },
    })
  }

  const handleDeleteCategory = (categoryId: string) => {
    if (view.type !== 'connected') return
    view.connection.client.send({
      type: 'DELETE_CATEGORY',
      payload: { category_id: categoryId },
    })
  }

  const handleRenameCategory = (categoryId: string, newName: string) => {
    if (view.type !== 'connected') return
    view.connection.client.send({
      type: 'RENAME_CATEGORY',
      payload: { category_id: categoryId, new_name: newName },
    })
  }

  const handleMoveChannelToCategory = (channelId: string, categoryId: string | null) => {
    if (view.type !== 'connected') return
    view.connection.client.send({
      type: 'MOVE_CHANNEL_TO_CATEGORY',
      payload: { channel_id: channelId, category_id: categoryId },
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
      await checkLocalServerStatus()
      if (!localServerStatus.installed) {
        alert('Server not found. Please use "Configure Server Path" to specify the server location manually.')
      }
      return
    }

    try {
      // Check if this is the first launch (no server.toml yet)
      const configured = await invoke<boolean>('is_server_configured')
      if (!configured) {
        // First time: ask for admin password before launching
        setLocalSetupPassword('')
        setLocalSetupError(null)
        setShowLocalServerSetupModal(true)
        return
      }

      // Already configured: launch directly
      await invoke('start_local_server', { adminPassword: null })
      console.log('Server started successfully')
      await _afterServerLaunched()
    } catch (error) {
      console.error('Failed to launch server:', error)
      alert(`Failed to launch server: ${error}`)
    }
  }

  const handleConfirmLocalServerSetup = async () => {
    if (!localSetupPassword || localSetupPassword.length < 8) {
      setLocalSetupError('Password must be at least 8 characters.')
      return
    }
    setLocalSetupError(null)
    setLocalSetupLaunching(true)
    try {
      await invoke('start_local_server', { adminPassword: localSetupPassword })
      setShowLocalServerSetupModal(false)
      setLocalSetupPassword('')
      await _afterServerLaunched()
    } catch (error) {
      setLocalSetupError(`Failed to launch: ${error}`)
    } finally {
      setLocalSetupLaunching(false)
    }
  }

  const _afterServerLaunched = async () => {
    const existingLocal = servers.find(s => s.isLocal)
    if (!existingLocal) {
      ServerManager.addServer({
        name: 'My Local Server',
        address: `localhost:${localServerStatus.port || 8080}`,
        isLocal: true,
      })
      setServers(ServerManager.loadServers())
    }
    setLocalServerStatus(prev => ({ ...prev, running: true }))
    await checkLocalServerStatus()
  }

  const generateSetupPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let pwd = ''
    for (let i = 0; i < 16; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    setLocalSetupPassword(pwd)
  }

  const handleManageLocalServer = () => {
    setManageModalTab('overview')
    setManageResetPassword('')
    setManageResetError(null)
    setManageDeleteConfirm(false)
    setManageDeleteText('')
    setShowLocalServerManageModal(true)
  }

  const handleStopLocalServer = async () => {
    try {
      await invoke('stop_local_server')
      setLocalServerStatus(prev => ({ ...prev, running: false }))
      await checkLocalServerStatus()
    } catch (error) {
      alert(`Failed to stop server: ${error}`)
    }
  }

  const handleResetAdminPassword = async () => {
    if (!manageResetPassword || manageResetPassword.length < 8) {
      setManageResetError('Password must be at least 8 characters.')
      return
    }
    setManageResetError(null)
    setManageResetLoading(true)
    try {
      // Deletes server.toml and stops server
      await invoke('reset_admin_password')
      // Re-launch with new password
      await invoke('start_local_server', { adminPassword: manageResetPassword })
      await checkLocalServerStatus()
      setShowLocalServerManageModal(false)
      setManageResetPassword('')
    } catch (error) {
      setManageResetError(`Failed: ${error}`)
    } finally {
      setManageResetLoading(false)
    }
  }

  const handleDeleteServerData = async () => {
    setManageDeleteLoading(true)
    try {
      await invoke('delete_server_data')
      await checkLocalServerStatus()
      setShowLocalServerManageModal(false)
      setManageDeleteConfirm(false)
      setManageDeleteText('')
    } catch (error) {
      alert(`Failed to delete server data: ${error}`)
    } finally {
      setManageDeleteLoading(false)
    }
  }

  const generateManagePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let pwd = ''
    for (let i = 0; i < 16; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    setManageResetPassword(pwd)
  }

  const handleConfigureServerPath = async () => {
    try {
      // Open file picker dialog using Tauri
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Executable',
            extensions: ['exe'],
          },
        ],
      })

      if (selected && typeof selected === 'string') {
        try {
          await invoke('set_server_path', { path: selected })
          alert('Server path configured successfully!')
          await checkLocalServerStatus()
        } catch (error) {
          console.error('Failed to set server path:', error)
          alert(`Failed to configure server path: ${error}`)
        }
      }
    } catch (error) {
      console.error('Failed to open file picker:', error)
      alert(`Failed to open file picker: ${error}`)
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
          onStopLocalServer={handleStopLocalServer}
          onManageLocalServer={handleManageLocalServer}
          onConfigureServerPath={handleConfigureServerPath}
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

        {/* Local Server Manage Modal */}
        {showLocalServerManageModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[#1e2128] border border-white/10 rounded-xl shadow-2xl w-full max-w-md mx-4">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-white">Local Server</h2>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${localServerStatus.running ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${localServerStatus.running ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                    {localServerStatus.running ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <button onClick={() => setShowLocalServerManageModal(false)} className="text-gray-400 hover:text-gray-200 transition-colors cursor-pointer" aria-label="Close">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/10 px-6">
                {(['overview', 'reset-password', 'delete-data'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      setManageModalTab(tab)
                      setManageResetError(null)
                      setManageDeleteConfirm(false)
                    }}
                    className={`py-2.5 px-1 mr-5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                      manageModalTab === tab ? 'border-white/60 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}>
                    {tab === 'overview' ? 'Overview' : tab === 'reset-password' ? 'Reset Password' : 'Delete Data'}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="px-6 py-5">
                {/* Overview tab */}
                {manageModalTab === 'overview' && (
                  <>
                    <div className="mb-4 text-xs text-gray-500 bg-white/5 rounded-lg p-3">
                      <p className="font-medium text-gray-400 mb-1">Data directory</p>
                      <code className="text-gray-300 break-all">~/.nexum/server/</code>
                      <p className="mt-1 text-gray-500">
                        Contains <code>server.toml</code> (config) and <code>data/server.db</code> (database).
                      </p>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setShowLocalServerManageModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer">
                        Close
                      </button>
                      {localServerStatus.running ? (
                        <button
                          onClick={async () => {
                            setShowLocalServerManageModal(false)
                            await handleStopLocalServer()
                          }}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium rounded-lg transition-colors cursor-pointer">
                          Stop Server
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            setShowLocalServerManageModal(false)
                            await handleLaunchLocalServer()
                          }}
                          className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 text-sm font-medium rounded-lg transition-colors cursor-pointer">
                          Start Server
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* Reset Password tab */}
                {manageModalTab === 'reset-password' && (
                  <>
                    <p className="text-sm text-gray-400 mb-4">Stops the server, clears the current config, and relaunches with a new admin password.</p>
                    <div className="mb-4">
                      <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">New Admin Password</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={manageResetPassword}
                          onChange={e => {
                            setManageResetPassword(e.target.value)
                            setManageResetError(null)
                          }}
                          placeholder="Enter or generate a password..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                        />
                        <button onClick={generateManagePassword} className="px-3 py-2 bg-white/10 hover:bg-white/15 text-gray-300 text-sm rounded-lg transition-colors cursor-pointer">
                          Generate
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Minimum 8 characters. Save this — you'll need it to authenticate as admin.</p>
                    </div>
                    {manageResetError && <p className="text-red-400 text-sm mb-3">{manageResetError}</p>}
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setShowLocalServerManageModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer" disabled={manageResetLoading}>
                        Cancel
                      </button>
                      <button
                        onClick={handleResetAdminPassword}
                        disabled={manageResetLoading || !manageResetPassword}
                        className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-40">
                        {manageResetLoading ? 'Resetting...' : 'Reset & Relaunch'}
                      </button>
                    </div>
                  </>
                )}

                {/* Delete Data tab */}
                {manageModalTab === 'delete-data' && (
                  <>
                    {/* Step 1: server must be stopped first */}
                    {localServerStatus.running ? (
                      <>
                        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <p className="text-sm text-yellow-300 font-medium mb-1">⏹ Server must be stopped first</p>
                          <p className="text-xs text-yellow-400/80">You must stop the local server before deleting its data. Stop it below, then return to this tab.</p>
                        </div>
                        <div className="flex gap-3 justify-end">
                          <button onClick={() => setShowLocalServerManageModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer">
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              await handleStopLocalServer()
                            }}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium rounded-lg transition-colors cursor-pointer">
                            Stop Server Now
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Step 2: server is stopped, allow deletion */}
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-sm text-red-300 font-medium mb-1">⚠️ This cannot be undone</p>
                          <p className="text-xs text-red-400">
                            Deletes <code>~/.nexum/server/data/</code> — all users, messages, and channels will be permanently removed. Server config (<code>server.toml</code>) is kept.
                          </p>
                        </div>
                        {!manageDeleteConfirm ? (
                          <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowLocalServerManageModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer">
                              Cancel
                            </button>
                            <button onClick={() => setManageDeleteConfirm(true)} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium rounded-lg transition-colors cursor-pointer">
                              Delete All Data
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-gray-300 mb-3">
                              Type <strong className="text-white">DELETE</strong> to confirm:
                            </p>
                            <input
                              type="text"
                              value={manageDeleteText}
                              onChange={e => setManageDeleteText(e.target.value)}
                              placeholder="DELETE"
                              className="w-full bg-white/5 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/60 mb-4"
                            />
                            <div className="flex gap-3 justify-end">
                              <button
                                onClick={() => {
                                  setManageDeleteConfirm(false)
                                  setManageDeleteText('')
                                }}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                                disabled={manageDeleteLoading}>
                                Cancel
                              </button>
                              <button
                                onClick={handleDeleteServerData}
                                disabled={manageDeleteLoading || manageDeleteText !== 'DELETE'}
                                className="px-4 py-2 bg-red-600/40 hover:bg-red-600/60 text-red-200 text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-40">
                                {manageDeleteLoading ? 'Deleting...' : 'Confirm Delete'}
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Local Server First-Launch Setup Modal */}
        {showLocalServerSetupModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[#1e2128] border border-white/10 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
              <h2 className="text-lg font-semibold text-white mb-1">🔐 Configure Local Server</h2>
              <p className="text-sm text-gray-400 mb-4">This is the first time launching your local server. Set an admin password to manage it.</p>

              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Admin Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={localSetupPassword}
                    onChange={e => setLocalSetupPassword(e.target.value)}
                    placeholder="Enter or generate a password..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                  />
                  <button onClick={generateSetupPassword} className="px-3 py-2 bg-white/10 hover:bg-white/15 text-gray-300 text-sm rounded-lg transition-colors cursor-pointer">
                    Generate
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters. Save this — you'll need it to authenticate as admin inside the server.</p>
              </div>

              <div className="mb-5 text-xs text-gray-500 bg-white/5 rounded-lg p-3">
                <p className="font-medium text-gray-400 mb-1">Data will be stored at:</p>
                <code className="text-gray-300">~/.nexum/server/</code>
                <p className="mt-1">
                  Contains <code>server.toml</code> (config) and <code>data/server.db</code> (database).
                </p>
              </div>

              {localSetupError && <p className="text-red-400 text-sm mb-3">{localSetupError}</p>}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowLocalServerSetupModal(false)
                    setLocalSetupPassword('')
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                  disabled={localSetupLaunching}>
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLocalServerSetup}
                  disabled={localSetupLaunching || !localSetupPassword}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-40">
                  {localSetupLaunching ? 'Launching...' : 'Launch Server'}
                </button>
              </div>
            </div>
          </div>
        )}
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
        categories={conn.categories}
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
        onCreateCategory={handleCreateCategory}
        onDeleteCategory={handleDeleteCategory}
        onRenameCategory={handleRenameCategory}
        onMoveChannelToCategory={handleMoveChannelToCategory}
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
