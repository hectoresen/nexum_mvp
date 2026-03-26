import { useState, useRef, useEffect } from 'react'
import { AppState } from '../App'
import { Channel, Category, User, UserRole, DmMessage } from '../types/protocol'
import ChannelList from './ChannelList'
import ChatArea from './ChatArea'
import UserListPanel from './UserListPanel'
import UserProfileModal from './UserProfileModal'
import DirectMessageView from './DirectMessageView'
import { useAppTheme } from '../hooks/useAppTheme'
import ServerImage from './ServerImage'

interface MainViewProps {
  state: AppState
  categories: Category[]
  serverName?: string
  serverAddress?: string
  currentUserAvatar?: string | null
  serverUsers: User[] | null
  dmMessages: Map<string, DmMessage[]>
  openDmTabs: string[]
  activeDmUserId: string | null
  onDisconnect: () => void
  onCreateChannel: (name: string, type: 'text' | 'voice', categoryId?: string) => void
  onJoinChannel: (channelId: string) => void
  onSendMessage: (content: string) => void
  onDeleteMessage?: (messageId: string) => void
  onEditMessage?: (messageId: string, content: string) => void
  onAuthenticateAdmin?: () => void
  onOpenServerSettings?: () => void
  onOpenClientSettings?: (section: 'general' | 'voice-video' | 'notifications') => void
  onRenameChannel?: (channelId: string, newName: string) => void
  onDeleteChannel?: (channelId: string) => void
  onOpenUserSettings?: () => void
  onCreateCategory?: (name: string) => void
  onDeleteCategory?: (categoryId: string) => void
  onRenameCategory?: (categoryId: string, newName: string) => void
  onMoveChannelToCategory?: (channelId: string, categoryId: string | null) => void
  onSendDmFromPopover?: (user: User, message: string) => void
  onOpenExistingDm?: (user: User) => void
  onSendDm?: (recipientId: string, content: string) => void
  onCloseDmTab?: (userId: string) => void
  onSwitchToDmView?: (userId: string) => void
  onSwitchToChannelView?: () => void
  unreadDmUserIds?: string[]
  unreadChannelIds?: Set<string>
  onKickUser?: (userId: string) => void
  onBanUser?: (userId: string, reason?: string) => void
  onMuteUser?: (userId: string, muteText: boolean, muteVoice: boolean) => void
}

export default function MainView({
  state,
  categories,
  serverName = 'Voice Server',
  serverAddress,
  currentUserAvatar,
  serverUsers,
  dmMessages,
  openDmTabs,
  activeDmUserId,
  onDisconnect,
  onCreateChannel,
  onJoinChannel,
  onSendMessage,
  onDeleteMessage,
  onEditMessage,
  onAuthenticateAdmin,
  onOpenServerSettings,
  onOpenClientSettings,
  onRenameChannel,
  onDeleteChannel,
  onOpenUserSettings,
  onCreateCategory,
  onDeleteCategory,
  onRenameCategory,
  onMoveChannelToCategory,
  onSendDmFromPopover,
  onOpenExistingDm,
  onSendDm,
  onCloseDmTab,
  onSwitchToDmView,
  onSwitchToChannelView,
  unreadDmUserIds = [],
  unreadChannelIds,
  onKickUser,
  onBanUser,
  onMuteUser,
}: MainViewProps) {
  const { tw } = useAppTheme()
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text')
  const [newChannelCategoryId, setNewChannelCategoryId] = useState<string | null>(null)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
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
      onCreateChannel(newChannelName.trim(), newChannelType, newChannelCategoryId ?? undefined)
      setNewChannelName('')
      setNewChannelCategoryId(null)
      setShowCreateChannel(false)
    }
  }

  const handleRequestCreateChannelInCategory = (categoryId: string) => {
    setNewChannelCategoryId(categoryId)
    setShowCreateChannel(true)
  }

  const currentChannel = state.channels.find((ch: Channel) => ch.id === state.currentChannelId)
  const currentMessages = state.currentChannelId ? state.messages.get(state.currentChannelId) || [] : []

  return (
    <div className={`flex h-full w-full ${tw.bgMain}`}>
      {/* User profile modal */}
      {selectedUser && <UserProfileModal user={selectedUser} serverAddress={serverAddress} currentUserRole={state.role || undefined} onClose={() => setSelectedUser(null)} />}

      {/* Sidebar */}
      <div className={`w-64 ${tw.bgHeader} flex flex-col border-r ${tw.borderDefault}`}>
        {/* Server header */}
        <div className={`p-4 border-b ${tw.borderDefault}`}>
          <h2 className={`${tw.textPrimary} font-semibold truncate`}>{serverName}</h2>
          <p className={`text-xs ${tw.textTertiary} mt-1`}>
            {state.username} • {state.role}
          </p>

          {/* Server Settings - only for owners */}
          <div className="mt-2 space-y-1">
            {state.role === 'owner' && onOpenServerSettings && (
              <button onClick={onOpenServerSettings} className={`w-full px-3 py-1.5 text-xs ${tw.btnSecondary} ${tw.textPrimary} rounded transition-colors flex items-center justify-center gap-2`}>
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
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className={`text-xs font-semibold ${tw.textTertiary} uppercase`}>Channels</span>
              {state.role === 'owner' && (
                <button onClick={() => setShowCreateChannel(!showCreateChannel)} className={`${tw.textTertiary} hover:${tw.textPrimary} transition-colors cursor-pointer`} title="Create channel">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>

            {showCreateChannel && (
              <form onSubmit={handleCreateChannel} className={`mb-3 p-2 ${tw.bgInput} rounded border ${tw.borderDefault}`}>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  placeholder="Channel name"
                  className={`w-full px-2 py-1 mb-2 text-sm ${tw.bgInput} border ${tw.borderDefault} rounded ${tw.textPrimary}`}
                  autoFocus
                />
                <div className="flex gap-2 mb-2">
                  <label className={`flex items-center text-xs ${tw.textSecondary}`}>
                    <input type="radio" value="text" checked={newChannelType === 'text'} onChange={() => setNewChannelType('text')} className="mr-1" />
                    Text
                  </label>
                  <label className={`flex items-center text-xs ${tw.textSecondary}`}>
                    <input type="radio" value="voice" checked={newChannelType === 'voice'} onChange={() => setNewChannelType('voice')} className="mr-1" />
                    Voice
                  </label>
                </div>
                {categories.length > 0 && (
                  <select
                    value={newChannelCategoryId ?? ''}
                    onChange={e => setNewChannelCategoryId(e.target.value || null)}
                    className={`w-full px-2 py-1 mb-2 text-xs ${tw.bgInput} border ${tw.borderDefault} rounded ${tw.textPrimary}`}>
                    <option value="">No category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex gap-2">
                  <button type="submit" className={`flex-1 px-2 py-1 text-xs ${tw.btnSecondary} ${tw.textPrimary} rounded`}>
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateChannel(false)
                      setNewChannelCategoryId(null)
                    }}
                    className={`flex-1 px-2 py-1 text-xs ${tw.btnSecondary} ${tw.textPrimary} rounded`}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <ChannelList
              channels={state.channels}
              categories={categories}
              currentChannelId={state.currentChannelId}
              role={state.role}
              onSelectChannel={onJoinChannel}
              onRenameChannel={onRenameChannel}
              onDeleteChannel={onDeleteChannel}
              onCreateCategory={onCreateCategory}
              onDeleteCategory={onDeleteCategory}
              onRenameCategory={onRenameCategory}
              onMoveChannelToCategory={onMoveChannelToCategory}
              onRequestCreateChannelInCategory={handleRequestCreateChannelInCategory}
              unreadChannelIds={unreadChannelIds}
            />
          </div>
        </div>

        {/* User info footer with dropdown */}
        <div className={`p-3 border-t ${tw.borderDefault} relative`} ref={dropdownRef}>
          <div className="flex items-center justify-between">
            <button onClick={() => setUserDropdownOpen(!userDropdownOpen)} className={`flex items-center gap-2 ${tw.bgHoverSubtle} rounded px-2 py-1 transition-colors flex-1 min-w-0 cursor-pointer`}>
              <div className={`w-8 h-8 rounded-full ${tw.bgInput} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                <ServerImage src={currentUserAvatar} alt={state.username} className="w-full h-full object-cover" fallback={<span className={`text-sm font-semibold ${tw.textPrimary}`}>{state.username[0]?.toUpperCase()}</span>} />
              </div>
              <span className={`text-sm ${tw.textPrimary} truncate flex-1 text-left`}>{state.username}</span>
              <svg className={`w-4 h-4 ${tw.textTertiary} transition-transform flex-shrink-0 ${userDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Dropdown Menu */}
          {userDropdownOpen && (
            <div className={`absolute bottom-full left-0 right-0 mb-2 ${tw.bgCard} rounded-lg shadow-xl border ${tw.borderDefault} py-1`}>
              {onOpenUserSettings && (
                <button
                  onClick={() => {
                    onOpenUserSettings()
                    setUserDropdownOpen(false)
                  }}
                  className={`w-full px-3 py-2 text-sm text-left ${tw.textPrimary} ${tw.bgHoverSubtle} transition-colors flex items-center gap-2`}>
                  <svg className={`w-4 h-4 ${tw.textTertiary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </button>
              )}
              {state.role === 'member' && onAuthenticateAdmin && (
                <button
                  onClick={() => {
                    onAuthenticateAdmin()
                    setUserDropdownOpen(false)
                  }}
                  className={`w-full px-3 py-2 text-sm text-left ${tw.textPrimary} ${tw.bgHoverSubtle} transition-colors flex items-center gap-2`}>
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
                  className={`w-full px-3 py-2 text-sm text-left ${tw.textPrimary} ${tw.bgHoverSubtle} transition-colors flex items-center gap-2`}>
                  <svg className={`w-4 h-4 ${tw.textTertiary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className={`w-full px-3 py-2 text-sm text-left text-red-400 ${tw.bgHoverSubtle} transition-colors flex items-center gap-2`}>
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* DM tab bar — shown when there are open DM conversations */}
        {openDmTabs.length > 0 && (
          <div className={`flex items-center gap-1 px-2 py-1.5 border-b ${tw.borderDefault} ${tw.bgHeader} overflow-x-auto flex-shrink-0`}>
            {/* Server tab */}
            <button
              onClick={onSwitchToChannelView}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                !activeDmUserId ? `bg-blue-600 text-white` : `${tw.bgHoverSubtle} ${tw.textSecondary} hover:${tw.textPrimary}`
              }`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Server
            </button>

            {/* DM tabs */}
            {openDmTabs.map(tabUserId => {
              const tabUser = serverUsers?.find(u => u.id === tabUserId)
              const isActive = activeDmUserId === tabUserId
              const hasUnread = unreadDmUserIds.includes(tabUserId)
              const dmsForTab = dmMessages.get(tabUserId) || []
              const label = tabUser?.username ?? dmsForTab.find(dm => dm.sender_id === tabUserId)?.sender_username ?? '…'
              return (
                <div key={tabUserId} className={`flex items-center gap-1 rounded flex-shrink-0 ${isActive ? 'bg-blue-600' : tw.bgHoverSubtle}`}>
                  <button
                    onClick={() => onSwitchToDmView?.(tabUserId)}
                    className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium transition-colors ${isActive ? 'text-white' : `${tw.textSecondary} hover:${tw.textPrimary}`}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {label}
                    {hasUnread && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />}
                  </button>
                  <button
                    onClick={() => onCloseDmTab?.(tabUserId)}
                    className={`pr-1.5 py-1 transition-colors ${isActive ? 'text-white/70 hover:text-white' : `${tw.textMuted} hover:${tw.textSecondary}`}`}
                    title="Close conversation">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Reconnecting banner — shown only after a successful session is lost */}
        {state.connecting && state.sessionId !== null && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/20 border-b border-amber-500/40 text-amber-400 text-sm">
            <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reconnecting to server…
          </div>
        )}

        {/* DM view or channel view */}
        {activeDmUserId ? (
          (() => {
            const dms = dmMessages.get(activeDmUserId) || []
            const fromDm = dms.find(dm => dm.sender_id === activeDmUserId)
            const otherUser: User | null = serverUsers?.find(u => u.id === activeDmUserId) ?? (
              fromDm ? {
                id: activeDmUserId,
                username: fromDm.sender_username,
                role: 'member' as UserRole,
                avatar_url: fromDm.sender_avatar_url,
                avatar_path: fromDm.sender_avatar_path,
                avatar_version: fromDm.sender_avatar_version,
                created_at: '',
              } : null
            )
            if (!otherUser)
              return (
                <div className="flex-1 flex items-center justify-center">
                  <p className={`${tw.textMuted} text-sm`}>Loading conversation…</p>
                </div>
              )
            return <DirectMessageView otherUser={otherUser} messages={dms} currentUserId={state.userId || ''} serverAddress={serverAddress} onSendMessage={content => onSendDm?.(activeDmUserId, content)} />
          })()
        ) : currentChannel ? (
          <ChatArea
            channel={currentChannel}
            messages={currentMessages}
            currentUserId={state.userId || ''}
            serverAddress={serverAddress}
            serverUsers={serverUsers}
            onSendMessage={onSendMessage}
            onDeleteMessage={onDeleteMessage}
            onEditMessage={onEditMessage}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className={`text-center ${tw.textMuted}`}>
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <UserListPanel
        users={serverUsers}
        currentUserId={state.userId}
        currentUserRole={state.role}
        serverAddress={serverAddress}
        openDmTabs={openDmTabs}
        unreadDmUserIds={unreadDmUserIds}
        onUserClick={setSelectedUser}
        onSendDm={onSendDmFromPopover}
        onOpenExistingDm={user => {
          onSwitchToDmView?.(user.id)
          onOpenExistingDm?.(user)
        }}
        onKick={onKickUser}
        onBan={onBanUser}
        onMute={onMuteUser}
      />
    </div>
  )
}
