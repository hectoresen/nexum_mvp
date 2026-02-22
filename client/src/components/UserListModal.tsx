import { User } from '../types/protocol'

interface UserListModalProps {
  users: User[] | null
  onClose: () => void
}

export default function UserListModal({ users, onClose }: UserListModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-[480px] max-h-[70vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Registered Users
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!users && (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto mb-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Loading users...
            </div>
          </div>
        )}

        {users && users.length === 0 && <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">No registered users</div>}

        {users && users.length > 0 && (
          <>
            <p className="text-sm text-gray-400 mb-3">
              {users.length} user{users.length !== 1 ? 's' : ''} registered
            </p>
            <div className="flex-1 overflow-y-auto space-y-1">
              {users.map(user => (
                <div key={user.id} className="flex items-center gap-3 px-3 py-2 bg-gray-700/50 rounded-md">
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-white">{user.username[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{user.username}</p>
                    <p className="text-xs text-gray-500">Joined {new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'owner' ? 'bg-amber-600/30 text-amber-400' : 'bg-gray-600/50 text-gray-400'}`}>{user.role}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
