import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAppTheme } from '../hooks/useAppTheme'

type SettingsSection = 'general' | 'voice-video' | 'notifications'

interface ClientSettingsModalProps {
  onClose: () => void
  initialSection?: SettingsSection
}

export default function ClientSettingsModal({ onClose, initialSection = 'general' }: ClientSettingsModalProps) {
  const { theme, tw, mode, setMode } = useAppTheme()
  const [currentSection, setCurrentSection] = useState<SettingsSection>(initialSection)
  const [autoStart, setAutoStart] = useState(false)
  const [autoStartLoading, setAutoStartLoading] = useState(false)
  const [language, setLanguage] = useState('en')
  const [audioInputDevice, setAudioInputDevice] = useState('default')
  const [audioOutputDevice, setAudioOutputDevice] = useState('default')
  const [dmSoundEnabled, setDmSoundEnabled] = useState(
    () => localStorage.getItem('nexum_dm_sound_enabled') === 'true'
  )

  // Load real auto-start state from OS registry on mount
  useEffect(() => {
    invoke<boolean>('is_auto_start_enabled')
      .then(setAutoStart)
      .catch(() => {})
  }, [])

  const handleAutoStartToggle = async (enabled: boolean) => {
    setAutoStartLoading(true)
    try {
      if (enabled) {
        await invoke('enable_auto_start')
      } else {
        await invoke('disable_auto_start')
      }
      setAutoStart(enabled)
    } catch (e) {
      console.error('Failed to change auto-start setting:', e)
    } finally {
      setAutoStartLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: theme.overlay }}>
      <div className={`${tw.bgCard} rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto shadow-xl border ${tw.borderDefault}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-semibold ${tw.textPrimary} flex items-center gap-2`}>
            <svg className={`w-6 h-6 ${tw.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            Client Settings
          </h2>
          <button onClick={onClose} className={`${tw.textTertiary} hover:${tw.textPrimary} transition-colors`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex gap-2 mb-6 border-b ${tw.borderDefault}`}>
          <button
            onClick={() => setCurrentSection('general')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${currentSection === 'general' ? `${tw.textPrimary} border-blue-500` : `${tw.textTertiary} border-transparent hover:${tw.textSecondary}`}`}>
            General
          </button>
          <button
            onClick={() => setCurrentSection('voice-video')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${currentSection === 'voice-video' ? `${tw.textPrimary} border-blue-500` : `${tw.textTertiary} border-transparent hover:${tw.textSecondary}`}`}>
            Voice & Video
          </button>
          <button
            onClick={() => setCurrentSection('notifications')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${currentSection === 'notifications' ? `${tw.textPrimary} border-blue-500` : `${tw.textTertiary} border-transparent hover:${tw.textSecondary}`}`}>
            Notifications
          </button>
        </div>

        <div className="space-y-6">
          {/* General Section */}
          {currentSection === 'general' && (
            <>
              <div>
                <h3 className={`text-lg font-semibold ${tw.textPrimary} mb-3 border-b ${tw.borderDefault} pb-2`}>Application</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className={`block text-sm font-medium ${tw.textSecondary}`}>Launch Nexum at Windows startup</label>
                      <p className={`text-xs ${tw.textMuted} mt-1`}>Launch Nexum automatically when your computer starts</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${autoStart ? 'text-green-400' : tw.textMuted}`}>
                        {autoStart ? 'ON' : 'OFF'}
                      </span>
                      <label className={`relative inline-flex items-center ${autoStartLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input type="checkbox" checked={autoStart} disabled={autoStartLoading} onChange={e => handleAutoStartToggle(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${tw.textSecondary} mb-2`}>Language</label>
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className={`w-full px-3 py-2 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none`}
                      style={{ '--tw-ring-color': theme.border.focus } as React.CSSProperties}>
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
                <h3 className={`text-lg font-semibold ${tw.textPrimary} mb-3 border-b ${tw.borderDefault} pb-2`}>Appearance</h3>
                <div className="space-y-3">
                  <div>
                    <label className={`block text-sm font-medium ${tw.textSecondary} mb-2`}>Theme</label>
                    <select
                      value={mode}
                      onChange={e => setMode(e.target.value as 'light' | 'dark')}
                      className={`w-full px-3 py-2 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none`}
                      style={{ '--tw-ring-color': theme.border.focus } as React.CSSProperties}>
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="auto" disabled>
                        Auto (Coming Soon)
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notifications Section */}
          {currentSection === 'notifications' && (
            <>
              <div>
                <h3 className={`text-lg font-semibold ${tw.textPrimary} mb-3 border-b ${tw.borderDefault} pb-2`}>Direct Messages</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className={`block text-sm font-medium ${tw.textSecondary}`}>Sound notifications for DMs</label>
                      <p className={`text-xs ${tw.textMuted} mt-1`}>Play a sound when a new direct message arrives</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${dmSoundEnabled ? 'text-green-400' : tw.textMuted}`}>
                        {dmSoundEnabled ? 'ON' : 'OFF'}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dmSoundEnabled}
                          onChange={e => {
                            const val = e.target.checked
                            setDmSoundEnabled(val)
                            localStorage.setItem('nexum_dm_sound_enabled', val ? 'true' : 'false')
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Voice & Video Section */}
          {currentSection === 'voice-video' && (
            <>
              <div>
                <h3 className={`text-lg font-semibold ${tw.textPrimary} mb-3 border-b ${tw.borderDefault} pb-2`}>Audio Devices</h3>
                <div className="space-y-3">
                  <div>
                    <label className={`block text-sm font-medium ${tw.textSecondary} mb-2`}>Input Device (Microphone)</label>
                    <select
                      value={audioInputDevice}
                      onChange={e => setAudioInputDevice(e.target.value)}
                      className={`w-full px-3 py-2 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none`}
                      style={{ '--tw-ring-color': theme.border.focus } as React.CSSProperties}>
                      <option value="default">Default System Device</option>
                      <option value="device-1" disabled>
                        Device enumeration coming soon
                      </option>
                    </select>
                    <p className={`text-xs ${tw.textMuted} mt-1`}>Select your microphone for voice chat</p>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${tw.textSecondary} mb-2`}>Output Device (Speakers/Headphones)</label>
                    <select
                      value={audioOutputDevice}
                      onChange={e => setAudioOutputDevice(e.target.value)}
                      className={`w-full px-3 py-2 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none`}
                      style={{ '--tw-ring-color': theme.border.focus } as React.CSSProperties}>
                      <option value="default">Default System Device</option>
                      <option value="device-1" disabled>
                        Device enumeration coming soon
                      </option>
                    </select>
                    <p className={`text-xs ${tw.textMuted} mt-1`}>Select your audio output for voice and sounds</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Footer Note */}
          <div className={`${tw.bgInput} rounded-lg p-4 border ${tw.borderDefault}`}>
            <p className={`text-xs ${tw.textTertiary} flex items-start gap-2`}>
              <svg className={`w-4 h-4 ${tw.textMuted} mt-0.5 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Some features are placeholders and will be fully implemented in future updates. Settings persistence across sessions is coming soon.</span>
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className={`px-6 py-2 ${tw.btnSecondary} rounded-md transition-colors cursor-pointer`}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
