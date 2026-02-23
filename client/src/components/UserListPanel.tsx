import { User } from '../types/protocol'

interface UserListPanelProps {
  users: User[] | null
  currentUserId: string | null
  serverAddress?: string // e.g., "localhost:8080"
}

export default function UserListPanel({ users, currentUserId, serverAddress }: UserListPanelProps) {
  console.log('UserListPanel render - users:', users, 'currentUserId:', currentUserId)

  if (!users) {
    return (
      <div className="w-56 bg-gray-800 border-l border-gray-700 flex flex-col">
        <div className="h-12 px-4 border-b border-gray-700 flex flex-col justify-center">
          <h3 className="text-white font-semibold text-sm">Server Members</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Separate by role
  const owners = users.filter(u => u.role === 'owner')
  const members = users.filter(u => u.role === 'member')

  const getAvatarUrl = (user: User): string | null => {
    // Prefer avatar_url (external URLs)
    if (user.avatar_url) return user.avatar_url
    
    // Use avatar_path with server address
    if (user.avatar_path && serverAddress) {
      return `http://${serverAddress}/${user.avatar_path}`
    }
    
    return null
  }

  const renderUser = (user: User) => {
    const isCurrentUser = user.id === currentUserId
    const avatarUrl = getAvatarUrl(user)
    
    return (
      <div
        key={user.id}
        className={`px-3 py-2 hover:bg-gray-700 transition-colors cursor-pointer flex items-center gap-2 ${isCurrentUser ? 'bg-gray-700/50' : ''}`}
        title={`${user.username}${isCurrentUser ? ' (you)' : ''}`}>
        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {avatarUrl ? <img src={avatarUrl} alt={user.username} className="w-full h-full object-cover" /> : <span className="text-xs font-semibold text-white">{user.username[0]?.toUpperCase()}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate ${isCurrentUser ? 'text-white font-medium' : 'text-gray-300'}`}>
            {user.username}
            {isCurrentUser && <span className="text-gray-500 ml-1">(you)</span>}
          </p>
        </div>
        {user.role === 'owner' && (
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )}
      </div>
    )
  }

  return (
    <div className="w-56 bg-gray-800 border-l border-gray-700 flex flex-col">
      <div className="h-12 px-4 border-b border-gray-700 flex flex-col justify-center">
        <h3 className="text-white font-semibold text-sm">Server Members</h3>
        <p className="text-xs text-gray-500 mt-1">{users.length} total</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Owners */}
        {owners.length > 0 && (
          <div className="py-2">
            <div className="px-3 py-1">
              <p className="text-xs font-semibold text-gray-400 uppercase">Owners</p>
            </div>
            {owners.map(renderUser)}
          </div>
        )}

        {/* Members */}
        {members.length > 0 && (
          <div className="py-2">
            <div className="px-3 py-1">
              <p className="text-xs font-semibold text-gray-400 uppercase">Members</p>
            </div>
            {members.map(renderUser)}
          </div>
        )}

        {users.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-gray-500 text-sm text-center">No users found</p>
          </div>
        )}
      </div>

      {/* Future: Private messages info */}
      <div className="p-3 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">Click user for private messages (coming soon)</p>
      </div>
    </div>
  )
}
