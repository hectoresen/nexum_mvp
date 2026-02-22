import { useState, useEffect } from 'react'
import { ServerSettingsPayload } from '../types/protocol'

interface ServerSettingsModalProps {
  serverName: string
  settings: ServerSettingsPayload | null
  onClose: () => void
  onSave: (settings: { name?: string; max_users?: number; max_users_per_voice_channel?: number; max_message_size?: number }) => void
  onChangePassword: () => void
}

export default function ServerSettingsModal({ serverName, settings, onClose, onSave, onChangePassword }: ServerSettingsModalProps) {
  const [name, setName] = useState(settings?.name ?? serverName)
  const [maxUsers, setMaxUsers] = useState(settings?.max_users ?? 200)
  const [maxVoice, setMaxVoice] = useState(settings?.max_users_per_voice_channel ?? 100)
  const [maxMsg, setMaxMsg] = useState(settings?.max_message_size ?? 2000)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setName(settings.name)
      setMaxUsers(settings.max_users)
      setMaxVoice(settings.max_users_per_voice_channel)
      setMaxMsg(settings.max_message_size)
    }
  }, [settings])

  const handleSave = () => {
    onSave({
      name: name.trim() || undefined,
      max_users: maxUsers,
      max_users_per_voice_channel: maxVoice,
      max_message_size: maxMsg,
    })

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {!settings && (
          <div className="text-center py-8 text-gray-400">
            <svg className="w-8 h-8 mx-auto mb-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Loading settings...
          </div>
        )}

        {settings && (
          <div className="space-y-6">
            {/* General Settings */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">General</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Server Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500" />
                </div>

                <div className="pt-3 border-t border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Security</h4>
                  <button onClick={onChangePassword} className="w-full px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-md transition-colors flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Change Admin Password
                  </button>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-1">WebSocket Port</label>
                    <input type="number" value={settings.ws_port} disabled className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-400 cursor-not-allowed" />
                    <p className="text-xs text-gray-500 mt-1">Requires server restart to change</p>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-1">UDP Port</label>
                    <input type="number" value={settings.udp_port} disabled className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-400 cursor-not-allowed" />
                  </div>
                </div>
              </div>
            </div>

            {/* Limits */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">Limits</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Max Users</label>
                  <input
                    type="number"
                    value={maxUsers}
                    min={1}
                    max={10000}
                    onChange={e => setMaxUsers(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Max Users per Voice Channel</label>
                  <input
                    type="number"
                    value={maxVoice}
                    min={1}
                    max={1000}
                    onChange={e => setMaxVoice(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Max Message Size (characters)</label>
                  <input
                    type="number"
                    value={maxMsg}
                    min={1}
                    max={100000}
                    onChange={e => setMaxMsg(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors">
            Close
          </button>
          {settings && (
            <button onClick={handleSave} className={`px-6 py-2 rounded-md transition-colors text-white font-medium ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-500'}`}>
              {saved ? '✓ Saved' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
