import { useState, useRef, useEffect } from 'react'
import { AppState } from '../App'
import { Channel, User } from '../types/protocol'
import ChannelList from './ChannelList'
import ChatArea from './ChatArea'
import UserListPanel from './UserListPanel'
import { tw } from '../theme'

interface MainViewProps {
  state: AppState
  serverName?: string // Optional server name to display
  serverAddress?: string // Server address for avatar URLs
  currentUserAvatar?: string | null // Current user's avatar URL
  serverUsers: User[] | null // List of all server users
  onDisconnect: () => void
  onCreateChannel: (name: string, type: 'text' | 'voice') => void
  onJoinChannel: (channelId: string) => void
  onSendMessage: (content: string) => void
  onAuthenticateAdmin?: () => void
  onOpenServerSettings?: () => void
  onOpenClientSettings?: (section: 'general' | 'voice-video') => void
  onRenameChannel?: (channelId: string, newName: string) => void
  onDeleteChannel?: (channelId: string) => void
  onViewUsers?: () => void
  onOpenUserSettings?: () => void
}

export default function MainView({
  state,
  serverName = 'Voice Server',
  serverAddress,
  currentUserAvatar,
  serverUsers,
  onDisconnect,
  onCreateChannel,
  onJoinChannel,
  onSendMessage,
  onAuthenticateAdmin,
  onOpenServerSettings,
  onOpenClientSettings,
  onRenameChannel,
  onDeleteChannel,
  onViewUsers,
  onOpenUserSettings,
}: MainViewProps) {
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text')
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault()
    if (newChannelName.trim()) {
      onCreateChannel(newChannelName.trim(), newChannelType)
      setNewChannelName('')
      setShowCreateChannel(false)
    }
  }

  const currentChannel = state.channels.find((ch: Channel) => ch.id === state.currentChannelId)
  const currentMessages = state.currentChannelId ? state.messages.get(state.currentChannelId) || [] : []

  return (
    <div className={`flex h-full w-full ${tw.bgMain}`}>
      {/* Sidebar */}
      <div className={`w-64 ${tw.bgHeader} flex flex-col`}>
        {/* Server header */}
        <div className={`p-4 border-b ${tw.borderDefault}`}>
          <h2 className="text-white font-semibold truncate">{serverName}</h2>
          <p className="text-xs text-gray-400 mt-1">
            {state.username} • {state.role}
          </p>

          {/* Server Settings - only for owners */}
          <div className="mt-2 space-y-1">
            {state.role === 'owner' && onOpenServerSettings && (
              <button onClick={onOpenServerSettings} className="w-full px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors flex items-center justify-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Server Settings
              </button>
            )}
            {state.role === 'owner' && onViewUsers && (
              <button onClick={onViewUsers} className="w-full px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors flex items-center justify-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                View Users
              </button>
            )}
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase">Channels</span>
              {state.role === 'owner' && (
                <button onClick={() => setShowCreateChannel(!showCreateChannel)} className="text-gray-400 hover:text-white transition-colors" title="Create channel">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>

            {showCreateChannel && (
              <form onSubmit={handleCreateChannel} className="mb-3 p-2 bg-gray-700 rounded">
                <input
                  type="text"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  placeholder="Channel name"
                  className="w-full px-2 py-1 mb-2 text-sm bg-gray-600 border border-gray-500 rounded text-white"
                  autoFocus
                />
                <div className="flex gap-2 mb-2">
                  <label className="flex items-center text-xs text-gray-300">
                    <input type="radio" value="text" checked={newChannelType === 'text'} onChange={() => setNewChannelType('text')} className="mr-1" />
                    Text
                  </label>
                  <label className="flex items-center text-xs text-gray-300">
                    <input type="radio" value="voice" checked={newChannelType === 'voice'} onChange={() => setNewChannelType('voice')} className="mr-1" />
                    Voice
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded">
                    Create
                  </button>
                  <button type="button" onClick={() => setShowCreateChannel(false)} className="flex-1 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <ChannelList channels={state.channels} currentChannelId={state.currentChannelId} role={state.role} onSelectChannel={onJoinChannel} onRenameChannel={onRenameChannel} onDeleteChannel={onDeleteChannel} />
          </div>
        </div>

        {/* User info footer with dropdown */}
        <div className="p-3 border-t border-gray-700 relative" ref={dropdownRef}>
          <div className="flex items-center justify-between">
            <button onClick={() => setUserDropdownOpen(!userDropdownOpen)} className="flex items-center gap-2 hover:bg-gray-700 rounded px-2 py-1 transition-colors flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {currentUserAvatar ? (
                  <img src={currentUserAvatar} alt={state.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-white">{state.username[0]?.toUpperCase()}</span>
                )}
              </div>
              <span className="text-sm text-white truncate flex-1 text-left">{state.username}</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${userDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Dropdown Menu */}
          {userDropdownOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1">
              {onOpenUserSettings && (
                <button
                  onClick={() => {
                    onOpenUserSettings()
                    setUserDropdownOpen(false)
                  }}
                  className="w-full px-3 py-2 text-sm text-left text-white hover:bg-gray-700 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  User Settings
                </button>
              )}
              {state.role === 'member' && onAuthenticateAdmin && (
                <button
                  onClick={() => {
                    onAuthenticateAdmin()
                    setUserDropdownOpen(false)
                  }}
                  className="w-full px-3 py-2 text-sm text-left text-white hover:bg-gray-700 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Authenticate as Admin
                </button>
              )}
              {onOpenClientSettings && (
                <button
                  onClick={() => {
                    onOpenClientSettings('general')
                    setUserDropdownOpen(false)
                  }}
                  className="w-full px-3 py-2 text-sm text-left text-white hover:bg-gray-700 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                  Client Settings
                </button>
              )}
              <button
                onClick={() => {
                  onDisconnect()
                  setUserDropdownOpen(false)
                }}
                className="w-full px-3 py-2 text-sm text-left text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {currentChannel ? (
          <ChatArea channel={currentChannel} messages={currentMessages} currentUserId={state.userId || ''} onSendMessage={onSendMessage} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-lg">Select a channel to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Right sidebar - User list */}
      <UserListPanel users={serverUsers} currentUserId={state.userId} serverAddress={serverAddress} />
    </div>
  )
}
