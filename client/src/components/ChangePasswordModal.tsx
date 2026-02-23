import { useState } from 'react'
import { theme, tw } from '../theme'
import { CancelButton } from './Button'

interface ChangePasswordModalProps {
  onClose: () => void
  onSave: (currentPassword: string, newPassword: string) => void
  error: string | null
}

export default function ChangePasswordModal({ onClose, onSave, error }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSave = () => {
    setLocalError('')

    if (!currentPassword) {
      setLocalError('Current password is required')
      return
    }
    if (!newPassword) {
      setLocalError('New password cannot be empty')
      return
    }
    if (newPassword.length < 4) {
      setLocalError('New password must be at least 4 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setLocalError('New passwords do not match')
      return
    }

    onSave(currentPassword, newPassword)
  }

  const displayError = error || localError

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: theme.overlay }}>
      <div className={`${tw.bgCard} rounded-lg p-6 w-[500px] shadow-2xl border ${tw.borderDefault}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-semibold ${tw.textPrimary} flex items-center gap-2`}>
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Change Admin Password
          </h2>
          <button onClick={onClose} className={`${tw.textTertiary} hover:${tw.textPrimary} transition-colors`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${tw.textSecondary} mb-2`}>Current Admin Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => {
                setCurrentPassword(e.target.value)
                setLocalError('')
              }}
              placeholder="Enter current password"
              className={`w-full px-3 py-2 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none focus:border-gray-500`}
              style={{ '--tw-ring-color': theme.border.focus } as React.CSSProperties}
              autoFocus
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${tw.textSecondary} mb-2`}>New Admin Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => {
                setNewPassword(e.target.value)
                setLocalError('')
              }}
              placeholder="Enter new password (min 4 characters)"
              className={`w-full px-3 py-2 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none focus:border-gray-500`}
              style={{ '--tw-ring-color': theme.border.focus } as React.CSSProperties}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${tw.textSecondary} mb-2`}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => {
                setConfirmPassword(e.target.value)
                setLocalError('')
              }}
              placeholder="Re-enter new password"
              className={`w-full px-3 py-2 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none focus:border-gray-500`}
              style={{ '--tw-ring-color': theme.border.focus } as React.CSSProperties}
            />
          </div>

          {displayError && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-md">
              <p className="text-sm text-red-200 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {displayError}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <CancelButton onClick={onClose} />
          <button onClick={handleSave} className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md transition-colors">
            Change Password
          </button>
        </div>
      </div>
    </div>
  )
}
