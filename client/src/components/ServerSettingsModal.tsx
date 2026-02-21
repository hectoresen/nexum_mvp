interface ServerSettingsModalProps {
  serverName: string
  onClose: () => void
}

export default function ServerSettingsModal({ serverName, onClose }: ServerSettingsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Server Settings
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* General Settings */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">General</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Server Name</label>
                <input type="text" value={serverName} disabled className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white opacity-60 cursor-not-allowed" />
                <p className="text-xs text-gray-500 mt-1">Editing coming soon</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Admin Password</label>
                <input type="password" value="••••••••" disabled className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white opacity-60 cursor-not-allowed" />
                <p className="text-xs text-gray-500 mt-1">Editing coming soon</p>
              </div>
            </div>
          </div>

          {/* Limits */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">Limits</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Max Users</label>
                <input type="number" value="200" disabled className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white opacity-60 cursor-not-allowed" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Max Users per Voice Channel</label>
                <input type="number" value="100" disabled className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white opacity-60 cursor-not-allowed" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Max Message Size (characters)</label>
                <input type="number" value="2000" disabled className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white opacity-60 cursor-not-allowed" />
              </div>
            </div>
          </div>

          {/* Banned Users (Coming soon) */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">Banned Users</h3>
            <div className="bg-gray-700 rounded-md p-4 text-center">
              <p className="text-gray-400 text-sm">No banned users</p>
              <p className="text-xs text-gray-500 mt-1">Ban system coming soon</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
