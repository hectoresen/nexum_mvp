import { useState } from 'react'
import { Channel, UserRole } from '../types/protocol'
import { tw } from '../theme'

interface ChannelListProps {
  channels: Channel[]
  currentChannelId: string | null
  role: UserRole | null
  onSelectChannel: (channelId: string) => void
  onRenameChannel?: (channelId: string, newName: string) => void
  onDeleteChannel?: (channelId: string) => void
}

export default function ChannelList({ channels, currentChannelId, role, onSelectChannel, onRenameChannel, onDeleteChannel }: ChannelListProps) {
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const isOwner = role === 'owner'

  const startRename = (channel: Channel, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingChannelId(channel.id)
    setEditName(channel.name)
  }

  const commitRename = (channelId: string) => {
    const trimmed = editName.trim()
    if (trimmed && onRenameChannel) {
      onRenameChannel(channelId, trimmed)
    }
    setEditingChannelId(null)
  }

  const cancelRename = () => {
    setEditingChannelId(null)
  }

  const handleDelete = (channelId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDeleteChannel && confirm('Delete this channel? This cannot be undone.')) {
      onDeleteChannel(channelId)
    }
  }

  const textChannels = channels.filter(ch => ch.channel_type === 'text')
  const voiceChannels = channels.filter(ch => ch.channel_type === 'voice')

  const renderChannel = (channel: Channel, icon: React.ReactNode) => {
    if (editingChannelId === channel.id) {
      return (
        <div key={channel.id} className="flex items-center gap-1 px-1 py-0.5">
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename(channel.id)
              if (e.key === 'Escape') cancelRename()
            }}
            onBlur={() => commitRename(channel.id)}
            autoFocus
            className={`flex-1 px-1.5 py-0.5 text-sm ${tw.bgInput} border ${tw.borderDefault} rounded ${tw.textPrimary} outline-none`}
          />
          <button onClick={cancelRename} className={`${tw.textTertiary} hover:${tw.textPrimary} p-0.5`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )
    }

    return (
      <div key={channel.id} className={`group flex items-center rounded transition-colors ${currentChannelId === channel.id ? tw.bgHoverSubtle : `hover:${tw.bgHoverSubtle}`}`}>
        <button
          onClick={() => onSelectChannel(channel.id)}
          className={`flex-1 text-left px-2 py-1.5 flex items-center gap-2 ${currentChannelId === channel.id ? tw.textPrimary : `${tw.textTertiary} group-hover:${tw.textSecondary}`}`}>
          {icon}
          <span className="text-sm truncate">{channel.name}</span>
        </button>

        {isOwner && (
          <div className="flex items-center gap-0.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => startRename(channel, e)} className={`p-0.5 ${tw.textTertiary} hover:${tw.textTertiary} transition-colors`} title="Rename channel">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={e => handleDelete(channel.id, e)}
              className={`p-0.5 ${tw.textTertiary} transition-colors`}
              style={{ color: undefined }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = '')}
              title="Delete channel">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {textChannels.length > 0 && (
        <div>
          <h3 className={`text-xs font-semibold ${tw.textMuted} uppercase px-2 mb-1`}>Text Channels</h3>
          {textChannels.map(channel => renderChannel(channel, <span className={`${tw.textMuted} text-sm`}>#</span>))}
        </div>
      )}

      {voiceChannels.length > 0 && (
        <div>
          <h3 className={`text-xs font-semibold ${tw.textMuted} uppercase px-2 mb-1`}>Voice Channels</h3>
          {voiceChannels.map(channel =>
            renderChannel(
              channel,
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>,
            ),
          )}
        </div>
      )}

      {channels.length === 0 && <div className={`px-2 py-4 text-center text-sm ${tw.textMuted}`}>No channels yet</div>}
    </div>
  )
}
