import { useState } from 'react'

interface AdminAuthModalProps {
  onClose: () => void
  onAuthenticate: (password: string) => void
}

export default function AdminAuthModal({ onClose, onAuthenticate }: AdminAuthModalProps) {
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.trim()) {
      onAuthenticate(password)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Admin Authentication
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-gray-300 text-sm mb-4">Enter the admin password to authenticate as an owner and gain full server control.</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="admin-password" className="block text-sm font-medium text-gray-300 mb-2">
              Admin Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!password.trim()} className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              Authenticate
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
