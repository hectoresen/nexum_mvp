import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { User } from '../types/protocol'
import { useAppTheme } from '../hooks/useAppTheme'

interface UserListPanelProps {
  users: User[] | null
  currentUserId: string | null
  currentUserRole?: 'owner' | 'member' | null
  serverAddress?: string
  openDmTabs?: string[] // userIds with open DM tabs
  unreadDmUserIds?: string[] // userIds with unread incoming DMs
  onUserClick?: (user: User) => void // View profile
  onSendDm?: (user: User, message: string) => void // Send first DM & open conversation
  onOpenExistingDm?: (user: User) => void // Open an already-open DM tab
  onKick?: (userId: string) => void
  onBan?: (userId: string, reason?: string) => void
  onMute?: (userId: string, muteText: boolean, muteVoice: boolean) => void
}

export default function UserListPanel({ users, currentUserId, currentUserRole, serverAddress, openDmTabs = [], unreadDmUserIds = [], onUserClick, onSendDm, onOpenExistingDm, onKick, onBan, onMute }: UserListPanelProps) {
  const { tw } = useAppTheme()
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null)
  const [dmInput, setDmInput] = useState('')
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number } | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const anchorRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const closePopover = useCallback(() => {
    setActivePopoverId(null)
    setDmInput('')
    setPopoverPos(null)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        closePopover()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [closePopover])

  if (!users) {
    return (
      <div className={`w-56 ${tw.bgHeader} border-l ${tw.borderDefault} flex flex-col`}>
        <div className={`h-12 px-4 border-b ${tw.borderDefault} flex flex-col justify-center`}>
          <h3 className={`${tw.textPrimary} font-semibold text-sm`}>Server Members</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className={`${tw.textMuted} text-sm`}>Loading...</p>
        </div>
      </div>
    )
  }

  const owners = users.filter(u => u.role === 'owner')
  const members = users.filter(u => u.role === 'member')

  const getAvatarUrl = (user: User): string | null => {
    if (user.avatar_url) return user.avatar_url
    if (user.avatar_path && serverAddress) return `http://${serverAddress}/${user.avatar_path}`
    return null
  }

  const handleUserClick = (user: User) => {
    if (user.id === currentUserId) {
      onUserClick?.(user)
      return
    }
    if (activePopoverId === user.id) {
      closePopover()
    } else {
      const anchor = anchorRefs.current.get(user.id)
      if (anchor) {
        const rect = anchor.getBoundingClientRect()
        // Anchor from top unless the row is in the lower half — then anchor from bottom
        // so the popover opens upward and stays on screen
        const useBottomAnchor = rect.top > window.innerHeight * 0.5
        setPopoverPos(
          useBottomAnchor
            ? { top: -(window.innerHeight - rect.bottom), right: window.innerWidth - rect.left + 8 }
            : { top: rect.top, right: window.innerWidth - rect.left + 8 }
        )
      }
      setActivePopoverId(user.id)
      setDmInput('')
    }
  }

  const handleSendDm = (user: User) => {
    const text = dmInput.trim()
    if (!text) return
    onSendDm?.(user, text)
    closePopover()
  }

  const renderUser = (user: User) => {
    const isCurrentUser = user.id === currentUserId
    const avatarUrl = getAvatarUrl(user)
    const isPopoverOpen = activePopoverId === user.id
    const hasOpenDm = openDmTabs.includes(user.id)
    const hasUnread = unreadDmUserIds.includes(user.id)

    return (
      <div
        key={user.id}
        ref={el => {
          if (el) anchorRefs.current.set(user.id, el)
          else anchorRefs.current.delete(user.id)
        }}>
        <div
          className={`px-3 py-2 ${tw.bgHoverSubtle} transition-colors cursor-pointer flex items-center gap-2 ${isCurrentUser ? tw.bgHover : ''} ${isPopoverOpen ? tw.bgHover : ''}`}
          title={`${user.username}${isCurrentUser ? ' (you)' : ''}`}
          onClick={() => handleUserClick(user)}>
          <div className={`w-8 h-8 rounded-full ${tw.bgInput} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
            {avatarUrl ? <img src={avatarUrl} alt={user.username} className="w-full h-full object-cover" /> : <span className={`text-xs font-medium ${tw.textPrimary}`}>{user.username[0]?.toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm truncate ${isCurrentUser ? `${tw.textPrimary} font-medium` : tw.textSecondary}`}>
              {user.username}
              {isCurrentUser && <span className={`${tw.textMuted} ml-1`}>(you)</span>}
            </p>
          </div>
          {/* Mute status icons */}
          {user.is_text_muted && <span title="Text muted" className="text-xs">🚫💬</span>}
          {user.is_voice_muted && <span title="Voice muted" className="text-xs">🚫🎙️</span>}
          {/* Unread message badge — red dot */}
          {hasUnread && !isCurrentUser && <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 animate-pulse" title="Unread message" />}
          {/* Open DM tab indicator — blue dot */}
          {hasOpenDm && !hasUnread && !isCurrentUser && <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" title="Open conversation" />}
          {user.role === 'owner' && (
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  // Find active user for portal popover
  const activeUser = users ? (users.find(u => u.id === activePopoverId) ?? null) : null
  const hasOpenDmForActive = activeUser ? openDmTabs.includes(activeUser.id) : false
  const hasUnreadForActive = activeUser ? unreadDmUserIds.includes(activeUser.id) : false

  return (
    <div className={`w-56 ${tw.bgHeader} border-l ${tw.borderDefault} flex flex-col`}>
      <div className={`h-12 px-4 border-b ${tw.borderDefault} flex flex-col justify-center`}>
        <h3 className={`${tw.textPrimary} font-semibold text-sm`}>Server Members</h3>
        <p className={`text-xs ${tw.textMuted} mt-1`}>{users.length} total</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {owners.length > 0 && (
          <div className="py-2">
            <div className="px-3 py-1">
              <p className={`text-xs font-semibold ${tw.textTertiary} uppercase`}>Owners</p>
            </div>
            {owners.map(renderUser)}
          </div>
        )}

        {members.length > 0 && (
          <div className="py-2">
            <div className="px-3 py-1">
              <p className={`text-xs font-semibold ${tw.textTertiary} uppercase`}>Members</p>
            </div>
            {members.map(renderUser)}
          </div>
        )}

        {users.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className={`${tw.textMuted} text-sm text-center`}>No users found</p>
          </div>
        )}
      </div>

      {openDmTabs.length > 0 && (
        <div className={`p-2 border-t ${tw.borderDefault}`}>
          <p className={`text-xs ${tw.textMuted} px-1 pb-1`}>Direct Messages</p>
          {openDmTabs.map(tabUserId => {
            const tabUser = users.find(u => u.id === tabUserId)
            if (!tabUser) return null
            const avatarUrl = getAvatarUrl(tabUser)
            return (
              <button key={tabUserId} onClick={() => onOpenExistingDm?.(tabUser)} className={`w-full px-2 py-1.5 rounded flex items-center gap-2 ${tw.bgHoverSubtle} transition-colors`}>
                <div className={`w-6 h-6 rounded-full ${tw.bgInput} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={tabUser.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className={`text-xs font-medium ${tw.textPrimary}`}>{tabUser.username[0]?.toUpperCase()}</span>
                  )}
                </div>
                <span className={`text-xs ${tw.textSecondary} truncate flex-1 text-left`}>{tabUser.username}</span>
                {unreadDmUserIds.includes(tabUserId) && <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 animate-pulse" />}
              </button>
            )
          })}
        </div>
      )}

      {/* Portal popover — rendered outside overflow containers to avoid clipping */}
      {activeUser &&
        popoverPos &&
        createPortal(
          <div
            ref={popoverRef}
            style={
              popoverPos.top < 0
                ? { position: 'fixed', bottom: -popoverPos.top, right: popoverPos.right, zIndex: 9999 }
                : { position: 'fixed', top: popoverPos.top, right: popoverPos.right, zIndex: 9999 }
            }
            className={`w-56 ${tw.bgCard} rounded-lg shadow-xl border ${tw.borderDefault} p-3`}>
            {/* Header */}
            <p className={`text-xs font-semibold ${tw.textPrimary} mb-2 flex items-center gap-2`}>
              {activeUser.username}
              {activeUser.role === 'owner' && <span className="text-amber-400 text-xs">★ admin</span>}
              {hasUnreadForActive && <span className="text-red-400 text-xs">● unread</span>}
            </p>

            {/* Open / view conversation */}
            <button
              onClick={() => {
                onOpenExistingDm?.(activeUser)
                closePopover()
              }}
              className={`w-full px-2 py-1.5 mb-2 text-xs rounded ${hasUnreadForActive ? 'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30' : `${tw.btnSecondary} ${tw.textPrimary}`} transition-colors flex items-center gap-2`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {hasUnreadForActive ? 'See new message' : hasOpenDmForActive ? 'View conversation' : 'Open conversation'}
            </button>

            {/* Send new message */}
            <form
              onSubmit={e => {
                e.preventDefault()
                handleSendDm(activeUser)
              }}>
              <input
                type="text"
                value={dmInput}
                onChange={e => setDmInput(e.target.value)}
                placeholder="Write a message..."
                autoFocus
                className={`w-full px-2 py-1.5 text-xs ${tw.bgInput} border ${tw.borderDefault} rounded ${tw.textPrimary} placeholder:${tw.textMuted} focus:outline-none focus:ring-1 focus:ring-blue-500/50 mb-2`}
              />
              <button
                type="submit"
                disabled={!dmInput.trim()}
                className="w-full px-2 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium">
                Send message
              </button>
            </form>

            {/* View profile */}
            <button
              onClick={() => {
                onUserClick?.(activeUser)
                closePopover()
              }}
              className={`w-full mt-2 px-2 py-1 text-xs ${tw.textMuted} hover:${tw.textSecondary} transition-colors text-left`}>
              View profile
            </button>

            {/* ── Moderation section — visible to owners only, disabled when target is admin ── */}
            {currentUserRole === 'owner' && activeUser.id !== currentUserId && (() => {
              const isTargetAdmin = activeUser.role === 'owner'
              const bothMuted = !!activeUser.is_text_muted && !!activeUser.is_voice_muted
              const btnBase = 'w-full px-2 py-1.5 text-xs rounded transition-colors text-left flex items-center gap-2'
              const disabledCls = 'opacity-40 cursor-not-allowed'
              return (
                <div className={`mt-2 pt-2 border-t ${tw.borderDefault} flex flex-col gap-0.5`}>
                  {isTargetAdmin && (
                    <p className={`text-xs ${tw.textTertiary} px-2 pb-1`}>
                      No se puede moderar a un administrador
                    </p>
                  )}

                  {/* Kick */}
                  <button
                    disabled={isTargetAdmin}
                    onClick={() => { if (!isTargetAdmin) { onKick?.(activeUser.id); closePopover() } }}
                    title={isTargetAdmin ? 'No se puede kickear a un admin' : 'Expulsar temporalmente (puede reconectarse)'}
                    className={`${btnBase} text-orange-400 hover:bg-orange-500/20 ${isTargetAdmin ? disabledCls : ''}`}>
                    <span>👢</span> Kick
                  </button>

                  {/* Ban */}
                  <button
                    disabled={isTargetAdmin}
                    onClick={() => { if (!isTargetAdmin) { onBan?.(activeUser.id); closePopover() } }}
                    title={isTargetAdmin ? 'No se puede banear a un admin' : 'Banear permanentemente'}
                    className={`${btnBase} text-red-400 hover:bg-red-500/20 ${isTargetAdmin ? disabledCls : ''}`}>
                    <span>🔨</span> Ban
                  </button>

                  <div className={`my-0.5 border-t ${tw.borderDefault} opacity-40`} />

                  {/* Mute text */}
                  {!activeUser.is_text_muted ? (
                    <button
                      disabled={isTargetAdmin}
                      onClick={() => { if (!isTargetAdmin) { onMute?.(activeUser.id, true, !!activeUser.is_voice_muted); closePopover() } }}
                      title={isTargetAdmin ? 'No se puede mutear a un admin' : 'Silenciar en canales de texto'}
                      className={`${btnBase} ${tw.textSecondary} hover:bg-yellow-500/10 ${isTargetAdmin ? disabledCls : ''}`}>
                      <span>🚫💬</span> Mutear texto
                    </button>
                  ) : (
                    <button
                      disabled={isTargetAdmin}
                      onClick={() => { if (!isTargetAdmin) { onMute?.(activeUser.id, false, !!activeUser.is_voice_muted); closePopover() } }}
                      title={isTargetAdmin ? 'No se puede desmutear a un admin' : 'Activar mensajes de texto'}
                      className={`${btnBase} text-yellow-400 hover:bg-yellow-500/10 ${isTargetAdmin ? disabledCls : ''}`}>
                      <span>💬</span> Desmutear texto
                    </button>
                  )}

                  {/* Mute voice */}
                  {!activeUser.is_voice_muted ? (
                    <button
                      disabled={isTargetAdmin}
                      onClick={() => { if (!isTargetAdmin) { onMute?.(activeUser.id, !!activeUser.is_text_muted, true); closePopover() } }}
                      title={isTargetAdmin ? 'No se puede mutear a un admin' : 'Silenciar en canales de voz'}
                      className={`${btnBase} ${tw.textSecondary} hover:bg-yellow-500/10 ${isTargetAdmin ? disabledCls : ''}`}>
                      <span>🚫🎙️</span> Mutear voz
                    </button>
                  ) : (
                    <button
                      disabled={isTargetAdmin}
                      onClick={() => { if (!isTargetAdmin) { onMute?.(activeUser.id, !!activeUser.is_text_muted, false); closePopover() } }}
                      title={isTargetAdmin ? 'No se puede desmutear a un admin' : 'Activar voz'}
                      className={`${btnBase} text-yellow-400 hover:bg-yellow-500/10 ${isTargetAdmin ? disabledCls : ''}`}>
                      <span>🎙️</span> Desmutear voz
                    </button>
                  )}

                  {/* Mute total / Unmute all */}
                  {!bothMuted ? (
                    <button
                      disabled={isTargetAdmin}
                      onClick={() => { if (!isTargetAdmin) { onMute?.(activeUser.id, true, true); closePopover() } }}
                      title={isTargetAdmin ? 'No se puede mutear a un admin' : 'Silenciar texto y voz a la vez'}
                      className={`${btnBase} ${tw.textSecondary} hover:bg-yellow-500/10 ${isTargetAdmin ? disabledCls : ''}`}>
                      <span>🔇</span> Mutear total
                    </button>
                  ) : (
                    <button
                      disabled={isTargetAdmin}
                      onClick={() => { if (!isTargetAdmin) { onMute?.(activeUser.id, false, false); closePopover() } }}
                      title={isTargetAdmin ? 'No se puede desmutear a un admin' : 'Quitar todo el silencio'}
                      className={`${btnBase} text-yellow-400 hover:bg-yellow-500/10 ${isTargetAdmin ? disabledCls : ''}`}>
                      <span>🔊</span> Desmutear todo
                    </button>
                  )}
                </div>
              )
            })()}
          </div>,
          document.body,
        )}
    </div>
  )
}
