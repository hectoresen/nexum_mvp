import { User } from '../types/protocol'
import { useAppTheme } from '../hooks/useAppTheme'
import { buildBaseUrl } from '../lib/urlUtils'
import ServerImage from './ServerImage'

interface UserProfileModalProps {
  user: User
  serverAddress?: string
  currentUserRole?: 'owner' | 'member'
  onClose: () => void
}

export default function UserProfileModal({ user, serverAddress, currentUserRole, onClose }: UserProfileModalProps) {
  const { tw } = useAppTheme()

  // Construct avatar URL
  const avatarUrl = user.avatar_url || (user.avatar_path && serverAddress ? `${buildBaseUrl(serverAddress)}/${user.avatar_path}` : null)
  const avatarInitial = user.username ? user.username[0]?.toUpperCase() : 'U'

  // Format join date
  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Role badge styling
  const roleBadgeClass = user.role === 'owner'
    ? 'bg-orange-500 text-white'
    : tw.bgInput + ' ' + tw.textSecondary

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={`${tw.bgCard} rounded-lg shadow-xl w-96 overflow-hidden border ${tw.borderDefault}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header with avatar */}
        <div className={`p-6 ${tw.bgHeader} border-b ${tw.borderDefault}`}>
          <div className="flex flex-col items-center">
            {/* Large avatar */}
            <div className={`w-20 h-20 rounded-full ${tw.bgInput} flex items-center justify-center overflow-hidden mb-3`}>
              <ServerImage src={avatarUrl} alt={user.username} className="w-full h-full object-cover" fallback={<span className={`text-2xl font-semibold ${tw.textPrimary}`}>{avatarInitial}</span>} />
            </div>
            
            {/* Username */}
            <h2 className={`text-xl font-semibold ${tw.textPrimary} mb-2`}>{user.username}</h2>
            
            {/* Role badge */}
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${roleBadgeClass}`}>
              {user.role.toUpperCase()}
            </span>
          </div>
        </div>

        {/* User info */}
        <div className="p-6 space-y-4">
          {/* Only show User ID to owner users */}
          {currentUserRole === 'owner' && (
            <div>
              <label className={`text-sm font-semibold ${tw.textTertiary} uppercase tracking-wide`}>
                User ID
              </label>
              <p className={`${tw.textSecondary} font-mono text-sm mt-1 truncate`}>{user.id}</p>
            </div>
          )}

          <div>
            <label className={`text-sm font-semibold ${tw.textTertiary} uppercase tracking-wide`}>
              Joined Server
            </label>
            <p className={`${tw.textSecondary} mt-1`}>{joinDate}</p>
          </div>

          {user.role === 'owner' && (
            <div className={`p-3 ${tw.bgInput} rounded-md`}>
              <p className={`text-sm ${tw.textSecondary}`}>
                <span className="font-semibold">👑 Server Owner</span> - This user has full administrative privileges.
              </p>
            </div>
          )}
        </div>

        {/* Footer with close button */}
        <div className={`p-4 border-t ${tw.borderDefault} flex justify-end gap-2`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 ${tw.btnSecondary} ${tw.textPrimary} rounded-md hover:${tw.bgHoverSubtle} transition-colors font-normal cursor-pointer`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
