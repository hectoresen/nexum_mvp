import { useState } from 'react'

interface AddServerModalProps {
  onClose: () => void
  onAdd: (address: string) => void
}

export default function AddServerModal({ onClose, onAdd }: AddServerModalProps) {
  const [address, setAddress] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (address.trim()) {
      onAdd(address.trim())
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Add Server</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="serverAddress" className="block text-sm font-medium text-gray-300 mb-2">
              Server Address
            </label>
            <input
              id="serverAddress"
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="localhost:8080 or 192.168.1.10:8080"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              autoFocus
              required
            />
            <p className="text-xs text-gray-400 mt-1">Format: host:port</p>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-md transition-colors">
              Add Server
            </button>
            <button type="button" onClick={onClose} className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold rounded-md transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
