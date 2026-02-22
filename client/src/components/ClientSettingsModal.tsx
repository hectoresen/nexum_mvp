import { useState } from 'react'

interface ClientSettingsModalProps {
  onClose: () => void
}

export default function ClientSettingsModal({ onClose }: ClientSettingsModalProps) {
  const [autoStart, setAutoStart] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [language, setLanguage] = useState('en')
  const [audioInputDevice, setAudioInputDevice] = useState('default')
  const [audioOutputDevice, setAudioOutputDevice] = useState('default')

  const handleSave = () => {
    // TODO: Implement settings persistence
    console.log('Settings saved:', { autoStart, theme, language, audioInputDevice, audioOutputDevice })
    onClose()
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
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            Client Settings
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
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Auto-start on System Boot</label>
                  <p className="text-xs text-gray-500 mt-1">Launch Voice MVP automatically when your computer starts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={autoStart} onChange={e => setAutoStart(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-500"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500">
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="ja">日本語</option>
                </select>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">Appearance</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
                <select value={theme} onChange={e => setTheme(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500">
                  <option value="dark">Dark</option>
                  <option value="light" disabled>
                    Light (Coming Soon)
                  </option>
                  <option value="auto" disabled>
                    Auto (Coming Soon)
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Audio Devices */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">Audio Devices</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Input Device (Microphone)</label>
                <select
                  value={audioInputDevice}
                  onChange={e => setAudioInputDevice(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500">
                  <option value="default">Default System Device</option>
                  <option value="device-1" disabled>
                    Device enumeration coming soon
                  </option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Select your microphone for voice chat</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Output Device (Speakers/Headphones)</label>
                <select
                  value={audioOutputDevice}
                  onChange={e => setAudioOutputDevice(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-gray-500">
                  <option value="default">Default System Device</option>
                  <option value="device-1" disabled>
                    Device enumeration coming soon
                  </option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Select your audio output for voice and sounds</p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-xs text-gray-400 flex items-start gap-2">
              <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Some features are placeholders and will be fully implemented in future updates. Settings persistence across sessions is coming soon.</span>
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
