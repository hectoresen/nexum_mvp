import { useState, useRef, useEffect } from 'react'
import { Channel, Message, User } from '../types/protocol'
import { useAppTheme } from '../hooks/useAppTheme'
import UserProfileModal from './UserProfileModal'

interface ChatAreaProps {
  channel: Channel
  messages: Message[]
  currentUserId: string
  serverAddress?: string // Server address for avatar URLs
  serverUsers: User[] | null // List of all server users for profile modal
  onSendMessage: (content: string) => void
}

export default function ChatArea({ channel, messages, currentUserId: _currentUserId, serverAddress, serverUsers, onSendMessage }: ChatAreaProps) {
  const { tw } = useAppTheme()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleUsernameClick = (userId: string) => {
    if (!serverUsers) return
    const user = serverUsers.find(u => u.id === userId)
    if (user) {
      setSelectedUser(user)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* User profile modal */}
      {selectedUser && (
        <UserProfileModal user={selectedUser} serverAddress={serverAddress} onClose={() => setSelectedUser(null)} />
      )}
      {/* Channel header */}
      <div className={`h-12 border-b ${tw.borderDefault} px-4 flex items-center justify-between ${tw.bgHeader}`}>
        <div className="flex items-center gap-2">
          {channel.channel_type === 'text' ? (
            <span className={tw.textTertiary}>#</span>
          ) : (
            <svg className={`w-5 h-5 ${tw.textTertiary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            </svg>
          )}
          <h2 className={`${tw.textPrimary} font-semibold`}>{channel.name}</h2>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className={tw.textMuted}>No messages yet. Be the first to say something!</p>
          </div>
        ) : (
          messages.map(message => {
            const displayName = message.username || `User ${message.user_id.substring(0, 8)}`
            const avatarInitial = message.username ? message.username[0]?.toUpperCase() : message.user_id[0]?.toUpperCase()
            
            // Construct avatar URL if avatar_path is available
            const avatarUrl = message.avatar_url || (message.avatar_path && serverAddress ? `http://${serverAddress}/${message.avatar_path}` : null)

            return (
              <div key={message.id} className="flex gap-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full ${tw.bgInput} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className={`text-sm font-semibold ${tw.textPrimary}`}>{avatarInitial}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`font-semibold ${tw.textPrimary} cursor-pointer hover:underline`}
                      onClick={() => handleUsernameClick(message.user_id)}
                    >
                      {displayName}
                    </span>
                    <span className={`text-xs ${tw.textMuted}`}>{formatTime(message.created_at)}</span>
                  </div>
                  <p className={`${tw.textSecondary} mt-1 break-words`}>{message.content}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      {channel.channel_type === 'text' && (
        <div className={`p-4 border-t ${tw.borderDefault}`}>
          <form onSubmit={handleSubmit}>
            <div className="flex gap-2 items-center">
              {/* Plus button for attachments */}
              <div className="relative group">
                <button type="button" className={`w-10 h-10 flex items-center justify-center ${tw.bgInput} ${tw.bgHover} rounded-full transition-colors ${tw.textSecondary} hover:${tw.textPrimary}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                {/* Dropdown menu - hidden for now */}
                <div className={`hidden group-hover:block absolute bottom-full left-0 mb-2 w-48 ${tw.bgCard} rounded-lg shadow-xl border ${tw.borderDefault} py-1`}>
                  <button className={`w-full px-3 py-2 text-sm text-left ${tw.textSecondary} ${tw.bgHoverSubtle} transition-colors flex items-center gap-2`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload File
                  </button>
                  <button className={`w-full px-3 py-2 text-sm text-left ${tw.textSecondary} ${tw.bgHoverSubtle} transition-colors flex items-center gap-2`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    Voice Message
                  </button>
                </div>
              </div>

              {/* Input with integrated buttons */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={`Message #${channel.name}`}
                  className={`w-full pl-4 pr-20 py-3 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                  maxLength={2000}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {/* GIF button */}
                  <button type="button" className={`px-2 py-1 text-xs font-bold ${tw.textTertiary} hover:${tw.textPrimary} transition-colors rounded`}>
                    GIF
                  </button>
                  {/* Send button - only visible when there's text */}
                  {input.trim() && (
                    <button type="submit" className={`p-1.5 ${tw.btnSecondary} ${tw.textPrimary} rounded transition-colors`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Voice channel info */}
      {channel.channel_type === 'voice' && (
        <div className={`p-4 border-t ${tw.borderDefault} ${tw.bgCard}`}>
          <div className="flex items-center justify-center gap-4">
            <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-normal rounded-md transition-colors cursor-pointer">Join Voice</button>
            <p className={`text-sm ${tw.textTertiary}`}>Voice chat not yet implemented</p>
          </div>
        </div>
      )}
    </div>
  )
}
