import { useState, useCallback } from 'react'
import { Channel, Category, UserRole } from '../types/protocol'
import { useAppTheme } from '../hooks/useAppTheme'

interface ChannelListProps {
  channels: Channel[]
  categories: Category[]
  currentChannelId: string | null
  role: UserRole | null
  onSelectChannel: (channelId: string) => void
  onRenameChannel?: (channelId: string, newName: string) => void
  onDeleteChannel?: (channelId: string) => void
  onCreateCategory?: (name: string) => void
  onDeleteCategory?: (categoryId: string) => void
  onRenameCategory?: (categoryId: string, newName: string) => void
  onMoveChannelToCategory?: (channelId: string, categoryId: string | null) => void
  onRequestCreateChannelInCategory?: (categoryId: string) => void
}

const STORAGE_KEY = 'nexum_collapsed_categories'

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch {}
  return new Set()
}

function saveCollapsed(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

// ─── Channel icon helpers ───────────────────────────────────────────────────
function TextIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-3.5 h-3.5'} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 3H2a1 1 0 00-1 1v9a1 1 0 001 1h7l3 3v-3h4a1 1 0 001-1V4a1 1 0 00-1-1zM5 7h10a1 1 0 110 2H5a1 1 0 010-2zm0 3h6a1 1 0 110 2H5a1 1 0 010-2z" clipRule="evenodd" />
    </svg>
  )
}

function VoiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-3.5 h-3.5'} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default function ChannelList({
  channels,
  categories = [],
  currentChannelId,
  role,
  onSelectChannel,
  onRenameChannel,
  onDeleteChannel,
  onCreateCategory,
  onDeleteCategory,
  onRenameCategory,
  onMoveChannelToCategory,
  onRequestCreateChannelInCategory,
}: ChannelListProps) {
  const { tw } = useAppTheme()
  const isOwner = role === 'owner'

  // Collapse state
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed)

  // Inline rename/delete for channels
  const [renamingChannelId, setRenamingChannelId] = useState<string | null>(null)
  const [renameChannelValue, setRenameChannelValue] = useState('')
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null)

  // Inline rename for categories
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null)
  const [renameCategoryValue, setRenameCategoryValue] = useState('')
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)

  // New category form
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  // Drag & drop
  const [dragOverId, setDragOverId] = useState<string | null>(null) // category id or 'uncategorized'

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveCollapsed(next)
      return next
    })
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, channelId: string) => {
    e.dataTransfer.setData('channelId', channelId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(targetId)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetCategoryId: string | null) => {
      e.preventDefault()
      setDragOverId(null)
      const channelId = e.dataTransfer.getData('channelId')
      if (channelId && onMoveChannelToCategory) {
        onMoveChannelToCategory(channelId, targetCategoryId)
      }
    },
    [onMoveChannelToCategory],
  )

  const handleDragLeave = useCallback(() => {
    setDragOverId(null)
  }, [])

  // ── Channel item renderer ──────────────────────────────────────────────────
  const renderChannel = (ch: Channel) => {
    const isActive = ch.id === currentChannelId
    const isRenaming = renamingChannelId === ch.id
    const isDeleting = deletingChannelId === ch.id

    return (
      <div
        key={ch.id}
        draggable={isOwner}
        onDragStart={isOwner ? e => handleDragStart(e, ch.id) : undefined}
        className={`group flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-sm transition-colors ${isActive ? `${tw.bgActive} ${tw.textPrimary}` : `${tw.textSecondary} ${tw.bgHoverSubtle}`}`}>
        {/* Channel icon */}
        <span className={`flex-shrink-0 ${isActive ? tw.textPrimary : tw.textTertiary}`}>{ch.channel_type === 'voice' ? <VoiceIcon /> : <TextIcon />}</span>

        {isRenaming ? (
          <form
            className="flex-1 flex gap-1"
            onSubmit={e => {
              e.preventDefault()
              if (renameChannelValue.trim() && onRenameChannel) {
                onRenameChannel(ch.id, renameChannelValue.trim())
              }
              setRenamingChannelId(null)
            }}>
            <input
              autoFocus
              value={renameChannelValue}
              onChange={e => setRenameChannelValue(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setRenamingChannelId(null)}
              onClick={e => e.stopPropagation()}
              className={`flex-1 min-w-0 px-1 py-0 text-xs rounded ${tw.bgInput} border ${tw.borderDefault} ${tw.textPrimary} focus:outline-none`}
            />
            <button type="submit" className="text-green-400 hover:text-green-300 text-xs">
              ✓
            </button>
            <button type="button" onClick={() => setRenamingChannelId(null)} className={`${tw.textTertiary} text-xs`}>
              ✕
            </button>
          </form>
        ) : isDeleting ? (
          <div className="flex-1 flex items-center gap-1 text-xs">
            <span className="text-red-400 truncate">Delete?</span>
            <button
              onClick={() => {
                onDeleteChannel?.(ch.id)
                setDeletingChannelId(null)
              }}
              className="text-red-400 hover:text-red-300">
              ✓
            </button>
            <button onClick={() => setDeletingChannelId(null)} className={tw.textTertiary}>
              ✕
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 truncate" onClick={() => onSelectChannel(ch.id)}>
              {ch.name}
            </span>
            {isOwner && (
              <span className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                <button
                  title="Rename"
                  onClick={e => {
                    e.stopPropagation()
                    setRenamingChannelId(ch.id)
                    setRenameChannelValue(ch.name)
                  }}
                  className={`${tw.textTertiary} hover:${tw.textPrimary} transition-colors`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  title="Delete"
                  onClick={e => {
                    e.stopPropagation()
                    setDeletingChannelId(ch.id)
                  }}
                  className="text-red-400 hover:text-red-300 transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </span>
            )}
          </>
        )}
      </div>
    )
  }

  // ── Category section renderer ──────────────────────────────────────────────
  const renderCategory = (cat: Category) => {
    const isCollapsed = collapsed.has(cat.id)
    const catChannels = channels.filter(ch => ch.category_id === cat.id)
    const isDragTarget = dragOverId === cat.id
    const isRenamingCat = renamingCategoryId === cat.id
    const isDeletingCat = deletingCategoryId === cat.id

    return (
      <div
        key={cat.id}
        onDragOver={isOwner ? e => handleDragOver(e, cat.id) : undefined}
        onDrop={isOwner ? e => handleDrop(e, cat.id) : undefined}
        onDragLeave={isOwner ? handleDragLeave : undefined}
        className={`mb-1 rounded transition-colors ${isDragTarget ? 'bg-white/10 ring-1 ring-white/20' : ''}`}>
        {/* Category header */}
        <div className="group flex items-center gap-1 px-2 py-1">
          {/* Collapse toggle */}
          <button onClick={() => toggleCollapse(cat.id)} className={`flex-shrink-0 ${tw.textTertiary} hover:${tw.textPrimary} transition-colors`} title={isCollapsed ? 'Expand' : 'Collapse'}>
            <svg className={`w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {isRenamingCat ? (
            <form
              className="flex-1 flex gap-1"
              onSubmit={e => {
                e.preventDefault()
                if (renameCategoryValue.trim() && onRenameCategory) {
                  onRenameCategory(cat.id, renameCategoryValue.trim())
                }
                setRenamingCategoryId(null)
              }}>
              <input
                autoFocus
                value={renameCategoryValue}
                onChange={e => setRenameCategoryValue(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setRenamingCategoryId(null)}
                className={`flex-1 min-w-0 px-1 py-0 text-xs rounded ${tw.bgInput} border ${tw.borderDefault} ${tw.textPrimary} focus:outline-none uppercase tracking-wide`}
              />
              <button type="submit" className="text-green-400 hover:text-green-300 text-xs">
                ✓
              </button>
              <button type="button" onClick={() => setRenamingCategoryId(null)} className={`${tw.textTertiary} text-xs`}>
                ✕
              </button>
            </form>
          ) : isDeletingCat ? (
            <div className="flex-1 flex items-center gap-1 text-xs">
              <span className="text-red-400 truncate flex-1">Delete category?</span>
              <button
                onClick={() => {
                  onDeleteCategory?.(cat.id)
                  setDeletingCategoryId(null)
                }}
                className="text-red-400 hover:text-red-300">
                ✓
              </button>
              <button onClick={() => setDeletingCategoryId(null)} className={tw.textTertiary}>
                ✕
              </button>
            </div>
          ) : (
            <>
              <span className={`flex-1 text-xs font-semibold ${tw.textTertiary} uppercase tracking-wide truncate`}>{cat.name}</span>
              {isOwner && (
                <span className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                  <button title="Add channel to category" onClick={() => onRequestCreateChannelInCategory?.(cat.id)} className={`${tw.textTertiary} hover:${tw.textPrimary} transition-colors`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    title="Rename category"
                    onClick={() => {
                      setRenamingCategoryId(cat.id)
                      setRenameCategoryValue(cat.name)
                    }}
                    className={`${tw.textTertiary} hover:${tw.textPrimary} transition-colors`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button title="Delete category" onClick={() => setDeletingCategoryId(cat.id)} className="text-red-400 hover:text-red-300 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </span>
              )}
            </>
          )}
        </div>

        {/* Category channels */}
        {!isCollapsed && <div className="pl-2">{catChannels.length === 0 ? <div className={`px-2 py-1 text-xs ${tw.textMuted} italic`}>No channels</div> : catChannels.map(renderChannel)}</div>}
      </div>
    )
  }

  // ── Uncategorized channels ─────────────────────────────────────────────────
  const uncategorized = channels.filter(ch => !ch.category_id)
  const isDragTargetUncategorized = dragOverId === 'uncategorized'

  return (
    <div className="space-y-0.5">
      {/* Category sections */}
      {categories.map(renderCategory)}

      {/* Uncategorized drop zone (always present if owner, or if there are channels) */}
      {(isOwner || uncategorized.length > 0) && (
        <div
          onDragOver={isOwner ? e => handleDragOver(e, 'uncategorized') : undefined}
          onDrop={isOwner ? e => handleDrop(e, null) : undefined}
          onDragLeave={isOwner ? handleDragLeave : undefined}
          className={`rounded transition-colors ${isDragTargetUncategorized ? 'bg-white/10 ring-1 ring-white/20' : ''}`}>
          {uncategorized.map(renderChannel)}
        </div>
      )}

      {/* Create Category button */}
      {isOwner && onCreateCategory && (
        <div className="pt-2">
          {showNewCategory ? (
            <form
              className="flex gap-1 px-2"
              onSubmit={e => {
                e.preventDefault()
                if (newCategoryName.trim()) {
                  onCreateCategory(newCategoryName.trim())
                  setNewCategoryName('')
                  setShowNewCategory(false)
                }
              }}>
              <input
                autoFocus
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setShowNewCategory(false)}
                placeholder="Category name"
                className={`flex-1 min-w-0 px-2 py-1 text-xs rounded ${tw.bgInput} border ${tw.borderDefault} ${tw.textPrimary} focus:outline-none placeholder-gray-500`}
              />
              <button type="submit" className="text-green-400 hover:text-green-300 text-xs px-1">
                ✓
              </button>
              <button type="button" onClick={() => setShowNewCategory(false)} className={`${tw.textTertiary} text-xs px-1`}>
                ✕
              </button>
            </form>
          ) : (
            <button onClick={() => setShowNewCategory(true)} className={`w-full flex items-center gap-1.5 px-2 py-1 text-xs ${tw.textTertiary} hover:${tw.textPrimary} transition-colors`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Category
            </button>
          )}
        </div>
      )}
    </div>
  )
}
