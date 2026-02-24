import { useState } from 'react'
import { useAppTheme } from '../hooks/useAppTheme'
import { CancelButton, WarningButton } from './Button'

interface AdminAuthModalProps {
  onClose: () => void
  onAuthenticate: (password: string) => void
  error?: string | null
}

export default function AdminAuthModal({ onClose, onAuthenticate, error }: AdminAuthModalProps) {
  const { theme, tw } = useAppTheme()
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.trim()) {
      onAuthenticate(password)
      // Do NOT close here - wait for server response
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: theme.overlay }}>
      <div className={`${tw.bgCard} rounded-lg p-6 w-96 shadow-xl border ${tw.borderDefault}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-semibold ${tw.textPrimary} flex items-center gap-2`}>
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Admin Authentication
          </h2>
          <button onClick={onClose} className={`${tw.textTertiary} hover:${tw.textPrimary} transition-colors`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className={`${tw.textSecondary} text-sm mb-4`}>Enter the admin password to authenticate as an owner and gain full server control.</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="admin-password" className={`block text-sm font-medium ${tw.textSecondary} mb-2`}>
              Admin Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className={`w-full px-4 py-2 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent`}
              style={{ '--tw-ring-color': theme.border.focus, '--placeholder-color': theme.text.placeholder } as React.CSSProperties}
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <CancelButton onClick={onClose} fullWidth />
            <WarningButton type="submit" disabled={!password.trim()} fullWidth>
              Authenticate
            </WarningButton>
          </div>
        </form>
      </div>
    </div>
  )
}
