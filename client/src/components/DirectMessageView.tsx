import { useState, useRef, useEffect } from 'react'
import { DmMessage, User } from '../types/protocol'
import { useAppTheme } from '../hooks/useAppTheme'
import { decryptDm } from '../lib/dmCrypto'
import { buildBaseUrl } from '../lib/urlUtils'
import ServerImage from './ServerImage'

interface DirectMessageViewProps {
  otherUser: User
  messages: DmMessage[]
  currentUserId: string
  serverAddress?: string
  onSendMessage: (content: string) => void
}

export default function DirectMessageView({ otherUser, messages, currentUserId, serverAddress, onSendMessage }: DirectMessageViewProps) {
  const { tw } = useAppTheme()
  const [input, setInput] = useState('')
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false)
  const [decryptedMessages, setDecryptedMessages] = useState<DmMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Decrypt messages lazily whenever the messages prop changes
  useEffect(() => {
    let cancelled = false

    async function decryptAll() {
      const result: DmMessage[] = []
      for (const msg of messages) {
        if (msg.content) {
          // Already decrypted (e.g., locally optimistic messages)
          result.push(msg)
        } else {
          try {
            const theirId = msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id
            const plaintext = await decryptDm(msg.encrypted_content, currentUserId, theirId)
            result.push({ ...msg, content: plaintext })
          } catch {
            result.push({ ...msg, content: '[Unable to decrypt]' })
          }
        }
      }
      if (!cancelled) setDecryptedMessages(result)
    }

    if (messages.length > 0) {
      decryptAll()
    } else {
      setDecryptedMessages([])
    }

    return () => {
      cancelled = true
    }
  }, [messages, currentUserId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [decryptedMessages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    onSendMessage(text)
    setInput('')
  }

  const getAvatarUrl = (avatarUrl: string | undefined, avatarPath: string | undefined): string | null => {
    if (avatarPath && serverAddress) return `${buildBaseUrl(serverAddress)}/${avatarPath}`
    if (avatarUrl) {
      if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')) return avatarUrl
      if (serverAddress) return `${buildBaseUrl(serverAddress)}/${avatarUrl}`
    }
    return null
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Group messages by date and collapse consecutive same-sender messages
  const groupedMessages: Array<{ date: string; messages: DmMessage[] }> = []
  let currentDate = ''
  for (const msg of decryptedMessages) {
    const date = formatDate(msg.created_at)
    if (date !== currentDate) {
      currentDate = date
      groupedMessages.push({ date, messages: [msg] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg)
    }
  }

  const otherAvatarUrl = getAvatarUrl(otherUser.avatar_url, otherUser.avatar_path)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`h-12 px-4 border-b ${tw.borderDefault} flex items-center gap-3 flex-shrink-0 ${tw.bgHeader}`}>
        <div className={`w-8 h-8 rounded-full ${tw.bgInput} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
          <ServerImage src={otherAvatarUrl} alt={otherUser.username} className="w-full h-full object-cover" fallback={<span className={`text-sm font-semibold ${tw.textPrimary}`}>{otherUser.username[0]?.toUpperCase()}</span>} />
        </div>
        <div>
          <p className={`text-sm font-semibold ${tw.textPrimary}`}>{otherUser.username}</p>
          <p className={`text-xs ${tw.textMuted}`}>Direct Message</p>
        </div>
      </div>

      {/* Privacy disclaimer */}
      {!disclaimerDismissed && (
        <div className={`mx-4 mt-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex-shrink-0`}>
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold text-amber-400 mb-1`}>Privacy Notice</p>
              <p className={`text-xs ${tw.textSecondary} leading-relaxed`}>
                Your messages are <strong className="text-amber-400">end-to-end encrypted</strong> before leaving your device. The server relays and stores encrypted data — the server owner{' '}
                <em>cannot read the content of your messages</em>.
              </p>
              <p className={`text-xs ${tw.textMuted} mt-1`}>There are no corporations or third parties involved — only you, the other user, and the server owner who hosts this community.</p>
            </div>
            <button onClick={() => setDisclaimerDismissed(true)} className={`${tw.textMuted} hover:${tw.textPrimary} transition-colors flex-shrink-0`} title="Dismiss">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-1 space-y-4">
        {messages.length === 0 && (
          <div className={`flex flex-col items-center justify-center h-full gap-3 ${tw.textMuted}`}>
            <div className={`w-16 h-16 rounded-full ${tw.bgInput} flex items-center justify-center`}>
              {otherAvatarUrl ? (
              <ServerImage src={otherAvatarUrl} alt={otherUser.username} className="w-full h-full object-cover rounded-full" fallback={<span className={`text-2xl font-semibold ${tw.textPrimary}`}>{otherUser.username[0]?.toUpperCase()}</span>} />
              ) : (
                <span className={`text-2xl font-semibold ${tw.textPrimary}`}>{otherUser.username[0]?.toUpperCase()}</span>
              )}
            </div>
            <p className={`text-sm font-semibold ${tw.textPrimary}`}>{otherUser.username}</p>
            <p className="text-sm text-center max-w-xs">
              This is the beginning of your direct message history with <strong className={tw.textPrimary}>{otherUser.username}</strong>. Messages are encrypted end-to-end.
            </p>
          </div>
        )}

        {groupedMessages.map(group => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-2 my-3">
              <div className={`flex-1 h-px ${tw.borderDefault}`} />
              <span className={`text-xs ${tw.textMuted} px-2`}>{group.date}</span>
              <div className={`flex-1 h-px ${tw.borderDefault}`} />
            </div>

            {group.messages.map((msg, idx) => {
              const isMe = msg.sender_id === currentUserId
              const prevMsg = idx > 0 ? group.messages[idx - 1] : null
              const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id
              const senderAvatar = getAvatarUrl(msg.sender_avatar_url, msg.sender_avatar_path)

              return (
                <div key={msg.id} className={`flex gap-3 ${showAvatar ? 'mt-3' : 'mt-0.5'}`}>
                  {/* Avatar column */}
                  <div className="w-10 flex-shrink-0">
                    {showAvatar && (
                      <div className={`w-10 h-10 rounded-full ${tw.bgInput} flex items-center justify-center overflow-hidden`}>
                        {senderAvatar ? (
                          <ServerImage src={senderAvatar} alt={msg.sender_username} className="w-full h-full object-cover" fallback={<span className={`text-sm font-semibold ${tw.textPrimary}`}>{msg.sender_username[0]?.toUpperCase()}</span>} />
                        ) : (
                          <span className={`text-sm font-semibold ${tw.textPrimary}`}>{msg.sender_username[0]?.toUpperCase()}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Message content */}
                  <div className="flex-1 min-w-0">
                    {showAvatar && (
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className={`text-sm font-semibold ${isMe ? 'text-blue-400' : tw.textPrimary}`}>{isMe ? 'You' : msg.sender_username}</span>
                        <span className={`text-xs ${tw.textMuted}`}>{formatTime(msg.created_at)}</span>
                      </div>
                    )}
                    <p className={`text-sm ${tw.textSecondary} leading-relaxed break-words`}>{msg.content}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`px-4 pb-4 pt-2 flex-shrink-0`}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Message ${otherUser.username}...`}
            className={`flex-1 px-3 py-2 text-sm ${tw.bgInput} border ${tw.borderDefault} rounded-lg ${tw.textPrimary} placeholder:${tw.textMuted} focus:outline-none focus:ring-1 focus:ring-blue-500/50`}
          />
          <button type="submit" disabled={!input.trim()} className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white`}>
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
