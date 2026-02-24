import { useState } from 'react'
import { useAppTheme } from '../hooks/useAppTheme'

interface AddServerModalProps {
  onClose: () => void
  onAdd: (address: string) => void
}

export default function AddServerModal({ onClose, onAdd }: AddServerModalProps) {
  const { theme, tw } = useAppTheme()
  const [host, setHost] = useState('')
  const [port, setPort] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (host.trim() && port.trim()) {
      onAdd(`${host.trim()}:${port.trim()}`)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: theme.overlay }}>
      <div className={`${tw.bgCard} rounded-lg shadow-xl w-full max-w-md border ${tw.borderDefault}`}>
        <div className={`flex items-center justify-between p-6 border-b ${tw.borderDefault}`}>
          <h2 className={`text-xl font-semibold ${tw.textPrimary}`}>Add Server</h2>
          <button onClick={onClose} className={`${tw.textTertiary} hover:${tw.textPrimary} transition-colors`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium ${tw.textSecondary} mb-2`}>Server Address</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  id="serverHost"
                  type="text"
                  value={host}
                  onChange={e => setHost(e.target.value)}
                  placeholder="localhost or 192.168.1.10"
                  className={`w-full px-4 py-3 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} ${tw.textMuted} focus:outline-none focus:ring-2 focus:border-transparent`}
                  style={{ '--tw-ring-color': theme.border.focus } as React.CSSProperties}
                  autoFocus
                  required
                />
                <p className={`text-xs ${tw.textMuted} mt-1`}>Host / IP</p>
              </div>
              <div className="w-32">
                <input
                  id="serverPort"
                  type="text"
                  value={port}
                  onChange={e => setPort(e.target.value)}
                  placeholder="8080"
                  className={`w-full px-4 py-3 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} ${tw.textMuted} focus:outline-none focus:ring-2 focus:border-transparent`}
                  style={{ '--tw-ring-color': theme.border.focus } as React.CSSProperties}
                  required
                />
                <p className={`text-xs ${tw.textMuted} mt-1`}>Port</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button type="submit" className={`flex-1 px-4 py-3 ${tw.btnPrimary} ${tw.textPrimary} font-semibold rounded-md transition-colors`}>
              Add Server
            </button>
            <button type="button" onClick={onClose} className={`px-4 py-3 ${tw.btnSecondary} ${tw.textSecondary} font-semibold rounded-md transition-colors`}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
