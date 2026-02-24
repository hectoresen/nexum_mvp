import { useState } from 'react'
import LocalServerPanel from './LocalServerPanel'
import { useAppTheme } from '../hooks/useAppTheme'

interface ConnectViewProps {
  onConnect: (serverAddress: string, username: string) => void
  connecting: boolean
  error: string | null
}

export default function ConnectView({ onConnect, connecting, error }: ConnectViewProps) {
  const { tw } = useAppTheme()
  const [username, setUsername] = useState('')
  const [serverAddress, setServerAddress] = useState('localhost:8080')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (username.trim() && serverAddress.trim()) {
      onConnect(serverAddress.trim(), username.trim())
    }
  }

  const handleServerStarted = () => {
    // Auto-fill localhost address when server starts
    setServerAddress('localhost:8080')
  }

  return (
    <div className={`flex items-center justify-center w-full h-full ${tw.bgMain}`}>
      <div className="w-full max-w-2xl p-8">
        <h1 className={`text-3xl font-bold text-center ${tw.textPrimary} mb-8`}>Nexum</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Local Server Panel */}
          <div className="lg:col-span-2">
            <LocalServerPanel onServerStarted={handleServerStarted} />
          </div>

          {/* Connection Form */}
          <div className={`lg:col-span-2 ${tw.bgCard} rounded-lg shadow-xl p-6`}>
            <h2 className={`text-xl font-semibold ${tw.textPrimary} mb-4`}>Connect to Server</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                />
              </div>

              <div>
                <label htmlFor="server" className={`block text-sm font-medium ${tw.textSecondary} mb-2`}>
                  Server Address
                </label>
                <input
                  id="server"
                  type="text"
                  value={serverAddress}
                  onChange={e => setServerAddress(e.target.value)}
                  placeholder="localhost:8080"
                  className={`w-full px-4 py-3 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent`}
                  disabled={connecting}
                  required
                />
                <p className={`text-xs ${tw.textTertiary} mt-1`}>Format: host:port (e.g., localhost:8080 or remote.server.com:8080)</p>
              </div>

              {error && (
                <div className="p-4 bg-red-900/50 border border-red-700 rounded-md">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={connecting || !username.trim() || !serverAddress.trim()}
                className={`w-full py-3 px-4 ${tw.btnSecondary} disabled:opacity-50 disabled:cursor-not-allowed ${tw.textPrimary} font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2`}>
                {connecting ? (
                  <span className="flex items-center justify-center">
                    <svg className={`animate-spin -ml-1 mr-3 h-5 w-5 ${tw.textPrimary}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </span>
                ) : (
                  'Connect'
                )}
              </button>
            </form>
          </div>
        </div>

        <div className={`mt-8 pt-6 border-t ${tw.borderDefault}`}>
          <p className={`text-sm ${tw.textTertiary} text-center`}>No account needed • Self-hosted • Privacy first</p>
        </div>
      </div>
    </div>
  )
}
