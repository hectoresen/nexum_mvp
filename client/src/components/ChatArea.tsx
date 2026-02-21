import { useState, useRef, useEffect } from 'react'
import { Channel, Message } from '../types/protocol'

interface ChatAreaProps {
  channel: Channel
  messages: Message[]
  currentUserId: string
  onSendMessage: (content: string) => void
}

export default function ChatArea({ channel, messages, onSendMessage }: ChatAreaProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="flex flex-col h-full">
      {/* Channel header */}
      <div className="h-14 border-b border-gray-700 px-4 flex items-center justify-between bg-gray-800">
        <div className="flex items-center gap-2">
          {channel.channel_type === 'text' ? (
            <span className="text-gray-400">#</span>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            </svg>
          )}
          <h2 className="text-white font-semibold">{channel.name}</h2>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No messages yet. Be the first to say something!</p>
          </div>
        ) : (
          messages.map(message => {
            const displayName = message.username || `User ${message.user_id.substring(0, 8)}`
            const avatarInitial = message.username ? message.username[0]?.toUpperCase() : message.user_id[0]?.toUpperCase()

            return (
              <div key={message.id} className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-white">{avatarInitial}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-white">{displayName}</span>
                    <span className="text-xs text-gray-500">{formatTime(message.created_at)}</span>
                  </div>
                  <p className="text-gray-200 mt-1 break-words">{message.content}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      {channel.channel_type === 'text' && (
        <div className="p-4 border-t border-gray-700">
          <form onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Message #${channel.name}`}
                className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={2000}
              />
              <button type="submit" disabled={!input.trim()} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors">
                Send
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Voice channel info */}
      {channel.channel_type === 'voice' && (
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center justify-center gap-4">
            <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors">Join Voice</button>
            <p className="text-sm text-gray-400">Voice chat not yet implemented</p>
          </div>
        </div>
      )}
    </div>
  )
}
