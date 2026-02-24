import { User } from '../types/protocol'
import { useAppTheme } from '../hooks/useAppTheme'

interface UserListModalProps {
  users: User[] | null
  onClose: () => void
}

export default function UserListModal({ users, onClose }: UserListModalProps) {
  const { theme, tw } = useAppTheme()
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: theme.overlay }}>
      <div className={`${tw.bgCard} rounded-lg p-6 w-[480px] max-h-[70vh] flex flex-col shadow-xl border ${tw.borderDefault}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-semibold ${tw.textPrimary} flex items-center gap-2`}>
            <svg className={`w-6 h-6 ${tw.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Registered Users
          </h2>
          <button onClick={onClose} className={`${tw.textTertiary} hover:${tw.textPrimary} transition-colors`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!users && (
          <div className={`flex-1 flex items-center justify-center ${tw.textTertiary}`}>
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto mb-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Loading users...
            </div>
          </div>
        )}

        {users && users.length === 0 && <div className={`flex-1 flex items-center justify-center ${tw.textMuted} text-sm`}>No registered users</div>}

        {users && users.length > 0 && (
          <>
            <p className={`text-sm ${tw.textTertiary} mb-3`}>
              {users.length} user{users.length !== 1 ? 's' : ''} registered
            </p>
            <div className="flex-1 overflow-y-auto space-y-1">
              {users.map(user => (
                <div key={user.id} className={`flex items-center gap-3 px-3 py-2 ${tw.bgInput} rounded-md border ${tw.borderSubtle}`}>
                  <div className={`w-8 h-8 rounded-full ${tw.bgHover} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-sm font-semibold ${tw.textPrimary}`}>{user.username[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${tw.textPrimary} truncate`}>{user.username}</p>
                    <p className={`text-xs ${tw.textMuted}`}>Joined {new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'owner' ? 'bg-amber-600/30 text-amber-400' : tw.bgHover + ' ' + tw.textTertiary}`}>{user.role}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className={`px-6 py-2 ${tw.btnSecondary} ${tw.textPrimary} rounded-md transition-colors`}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
