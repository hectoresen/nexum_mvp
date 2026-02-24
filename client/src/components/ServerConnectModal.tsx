import { useState } from 'react'
import { useAppTheme } from '../hooks/useAppTheme'
import { CancelButton, PrimaryButton } from './Button'

interface ServerConnectModalProps {
  serverName: string
  serverAddress: string
  lastUsername?: string
  onConnect: (username: string) => void
  onCancel: () => void
  connecting: boolean
  error: string | null
}

export default function ServerConnectModal({ serverName, serverAddress, lastUsername, onConnect, onCancel, connecting, error }: ServerConnectModalProps) {
  const { theme, tw } = useAppTheme()
  const [username, setUsername] = useState(lastUsername || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (username.trim()) {
      onConnect(username.trim())
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: theme.overlay }}>
      <div className={`${tw.bgCard} rounded-lg shadow-xl w-full max-w-md`}>
        <div className={`flex items-center justify-between p-6 border-b ${tw.borderDefault}`}>
          <div>
            <h2 className={`text-xl font-semibold ${tw.textPrimary}`}>Connect to Server</h2>
            <p className={`text-sm ${tw.textTertiary} mt-1`}>{serverName}</p>
          </div>
          {!connecting && (
            <button onClick={onCancel} className={`${tw.textTertiary} hover:${tw.textPrimary} transition-colors`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className={`${tw.bgInput} rounded-lg p-4 mb-4`}>
            <p className={`text-sm ${tw.textSecondary} flex items-center gap-2`}>
              <svg className={`w-4 h-4 ${tw.textTertiary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              <span className="font-mono text-xs">{serverAddress}</span>
            </p>
          </div>

          <div>
            <label htmlFor="username" className={`block text-sm font-medium ${tw.textSecondary} mb-2`}>
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              className={`w-full px-4 py-3 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent`}
              disabled={connecting}
              required
              minLength={1}
              maxLength={32}
              autoFocus
            />
            <p className={`text-xs ${tw.textTertiary} mt-1`}>This username is local to this server only</p>
          </div>

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-md">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <PrimaryButton
              type="submit"
              disabled={connecting || !username.trim()}
              fullWidth>
              {connecting ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Connecting...</span>
                </div>
              ) : (
                'Connect'
              )}
            </PrimaryButton>
            {!connecting && <CancelButton onClick={onCancel} />}
          </div>
        </form>
      </div>
    </div>
  )
}
