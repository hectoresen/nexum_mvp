import { useState } from 'react'
import { useAppTheme } from '../hooks/useAppTheme'

interface JoinPasswordModalProps {
  serverName: string
  serverAddress: string
  /** Called when the user submits the password */
  onSubmit: (password: string) => void
  /** Called when the user cancels */
  onCancel: () => void
  /** Error message from the last failed attempt */
  error: string | null
  /** Whether a connection attempt is in progress */
  connecting: boolean
}

export default function JoinPasswordModal({ serverName, serverAddress, onSubmit, onCancel, error, connecting }: JoinPasswordModalProps) {
  const { theme, tw } = useAppTheme()
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.trim()) onSubmit(password.trim())
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: theme.overlay }}>
      <div className={`${tw.bgCard} rounded-lg w-[400px] shadow-xl border ${tw.borderDefault} flex flex-col`} role="dialog" aria-modal="true" aria-label="Server join password">
        {/* Header */}
        <div className={`flex items-center gap-3 px-6 py-5 border-b ${tw.borderDefault}`}>
          <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className={`text-base font-semibold ${tw.textPrimary}`}>Password Required</h2>
            <p className={`text-xs ${tw.textTertiary} mt-0.5`}>
              <span className="font-medium" style={{ color: theme.text.secondary }}>
                {serverName}
              </span>{' '}
              · <span className="font-mono">{serverAddress}</span>
            </p>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className={`text-sm ${tw.textSecondary}`}>This server is private. Enter the join password to connect.</p>

          <div>
            <label className={`block text-xs font-medium ${tw.textTertiary} mb-1`}>Join Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter join password"
              autoFocus
              disabled={connecting}
              className={`w-full px-3 py-2 ${tw.bgInput} border ${error ? 'border-red-500' : tw.borderDefault} rounded-md ${tw.textPrimary} placeholder-gray-400 focus:outline-none text-sm`}
            />
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onCancel} disabled={connecting} className={`px-4 py-2 ${tw.btnSecondary} ${tw.textPrimary} rounded-md text-sm transition-colors cursor-pointer disabled:opacity-50`}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={connecting || !password.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2">
              {connecting ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connecting…
                </>
              ) : (
                'Connect'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
