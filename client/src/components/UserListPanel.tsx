import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { User } from '../types/protocol'
import { useAppTheme } from '../hooks/useAppTheme'

interface UserListPanelProps {
  users: User[] | null
  currentUserId: string | null
  serverAddress?: string
  openDmTabs?: string[] // userIds with open DM tabs
  onUserClick?: (user: User) => void // View profile
  onSendDm?: (user: User, message: string) => void // Send first DM & open conversation
  onOpenExistingDm?: (user: User) => void // Open an already-open DM tab
}

export default function UserListPanel({
  users,
  currentUserId,
  serverAddress,
  openDmTabs = [],
  onUserClick,
  onSendDm,
  onOpenExistingDm,
}: UserListPanelProps) {
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
        setPopoverPos({
          top: rect.top,
          right: window.innerWidth - rect.left + 8, // 8px gap to the left of the panel
        })
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
            {avatarUrl ? (
              <img src={avatarUrl} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <span className={`text-xs font-medium ${tw.textPrimary}`}>
                {user.username[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm truncate ${isCurrentUser ? `${tw.textPrimary} font-medium` : tw.textSecondary}`}>
              {user.username}
              {isCurrentUser && <span className={`${tw.textMuted} ml-1`}>(you)</span>}
            </p>
          </div>
          {/* Badge for open DM tab */}
          {hasOpenDm && !isCurrentUser && (
            <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" title="Open conversation" />
          )}
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
  const activeUser = users ? users.find(u => u.id === activePopoverId) ?? null : null
  const hasOpenDmForActive = activeUser ? openDmTabs.includes(activeUser.id) : false

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
              <button
                key={tabUserId}
                onClick={() => onOpenExistingDm?.(tabUser)}
                className={`w-full px-2 py-1.5 rounded flex items-center gap-2 ${tw.bgHoverSubtle} transition-colors`}>
                <div className={`w-6 h-6 rounded-full ${tw.bgInput} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={tabUser.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className={`text-xs font-medium ${tw.textPrimary}`}>
                      {tabUser.username[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <span className={`text-xs ${tw.textSecondary} truncate flex-1 text-left`}>{tabUser.username}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Portal popover — rendered outside overflow containers to avoid clipping */}
      {activeUser && popoverPos && createPortal(
        <div
          ref={popoverRef}
          style={{ position: 'fixed', top: popoverPos.top, right: popoverPos.right, zIndex: 9999 }}
          className={`w-52 ${tw.bgCard} rounded-lg shadow-xl border ${tw.borderDefault} p-3`}>
          <p className={`text-xs font-semibold ${tw.textPrimary} mb-2`}>{activeUser.username}</p>

          {/* Open existing conversation */}
          {hasOpenDmForActive && (
            <button
              onClick={() => {
                onOpenExistingDm?.(activeUser)
                closePopover()
              }}
              className={`w-full px-2 py-1.5 mb-2 text-xs rounded ${tw.btnSecondary} ${tw.textPrimary} transition-colors flex items-center gap-2`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Open conversation
            </button>
          )}

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
        </div>,
        document.body
      )}
    </div>
  )
}