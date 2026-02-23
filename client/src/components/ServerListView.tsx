import { useState, useRef, useEffect } from 'react'
import { SavedServer } from '../types/server'

interface ServerListViewProps {
  servers: SavedServer[]
  onSelectServer: (server: SavedServer) => void
  onAddServer: () => void
  onDeleteServer: (serverId: string) => void
  onLaunchLocalServer: () => void
  onOpenClientSettings: (section: 'general' | 'voice-video') => void
  localServerStatus: { installed: boolean; running: boolean }
}

export default function ServerListView({ servers, onSelectServer, onAddServer, onDeleteServer, onLaunchLocalServer, onOpenClientSettings, localServerStatus }: ServerListViewProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [serverDropdownOpen, setServerDropdownOpen] = useState(false)
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false)
  const serverDropdownRef = useRef<HTMLDivElement>(null)
  const settingsDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(event.target as Node)) {
        setServerDropdownOpen(false)
      }
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setSettingsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLaunchServer = () => {
    setServerDropdownOpen(false)
    onLaunchLocalServer()
  }

  const handleAddServerFromDropdown = () => {
    setServerDropdownOpen(false)
    onAddServer()
  }

  const handleOpenSettings = (section: 'general' | 'voice-video') => {
    setSettingsDropdownOpen(false)
    onOpenClientSettings(section)
  }

  return (
    <div className="flex flex-col w-full h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-gray-800 border-b border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-white">Nexum</h1>
          <p className="text-sm text-gray-400 mt-1">Secure voice and text communication</p>

          {/* Navigation Dropdown */}
          <div className="flex items-center gap-4 mt-2">
            {/* Server Dropdown */}
            <div className="relative" ref={serverDropdownRef}>
              <button onClick={() => setServerDropdownOpen(!serverDropdownOpen)} className="text-gray-300 hover:text-white transition-colors flex items-center gap-1 text-sm">
                Server
                <svg className={`w-3 h-3 transition-transform ${serverDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {serverDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 rounded-md shadow-xl z-50">
                  {/* Server Status Header */}
                  <div className="px-4 py-3 border-b border-gray-700/50">
                    <p className="text-xs font-semibold text-gray-400 uppercase">Local Server</p>
                    <p className="text-sm text-gray-300 mt-1">{localServerStatus.installed ? (localServerStatus.running ? '🟢 Running' : '⚪ Installed') : '🔴 Not Installed'}</p>
                  </div>

                  {/* Dropdown Options */}
                  <div className="py-2">
                    {localServerStatus.installed ? (
                      <button onClick={handleLaunchServer} className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors flex items-center gap-3">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium">{localServerStatus.running ? 'Configure Server' : 'Start Server'}</p>
                          <p className="text-xs text-gray-400">{localServerStatus.running ? 'Manage local server' : 'Launch local instance'}</p>
                        </div>
                      </button>
                    ) : (
                      <button onClick={handleLaunchServer} className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors flex items-center gap-3">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium">Download Server</p>
                          <p className="text-xs text-gray-400">Install server launcher</p>
                        </div>
                      </button>
                    )}

                    <div className="my-2 border-t border-gray-700/50"></div>

                    {/* Add Server Option */}
                    <button onClick={handleAddServerFromDropdown} className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium">Add Server</p>
                        <p className="text-xs text-gray-400">Connect to external server</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings Dropdown */}
            <div className="relative" ref={settingsDropdownRef}>
              <button onClick={() => setSettingsDropdownOpen(!settingsDropdownOpen)} className="text-gray-300 hover:text-white transition-colors flex items-center gap-1 text-sm">
                Settings
                <svg className={`w-3 h-3 transition-transform ${settingsDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Settings Dropdown Menu */}
              {settingsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-gray-800 rounded-md shadow-xl z-50">
                  <div className="py-2">
                    {/* General Option */}
                    <button onClick={() => handleOpenSettings('general')} className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium">General</p>
                        <p className="text-xs text-gray-400">App, language & appearance</p>
                      </div>
                    </button>

                    {/* Voice & Video Option */}
                    <button onClick={() => handleOpenSettings('voice-video')} className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium">Voice & Video</p>
                        <p className="text-xs text-gray-400">Audio input & output devices</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Servers List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Server List</h2>
              <button onClick={onAddServer} className="text-gray-400 hover:text-white transition-colors" title="Add Server">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {servers.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
                <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                  />
                </svg>
                <p className="text-gray-400 text-lg mb-2">No servers yet</p>
                <p className="text-gray-500 text-sm">Click the + button or Server menu to add a server</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {servers.map(server => (
                  <div key={server.id} className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-gray-600 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{server.name}</h3>
                          {server.isLocal && <span className="px-2 py-1 text-xs font-medium bg-green-900/50 text-green-300 rounded">LOCAL</span>}
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm text-gray-400 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                              />
                            </svg>
                            {server.address}
                          </p>
                          {server.lastUsername && <p className="text-sm text-gray-500">Last used as: {server.lastUsername}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button onClick={() => onSelectServer(server)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors" title="Connect">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                        </button>

                        {confirmDelete === server.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                onDeleteServer(server.id)
                                setConfirmDelete(null)
                              }}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors">
                              Confirm
                            </button>
                            <button onClick={() => setConfirmDelete(null)} className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(server.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-md transition-colors" title="Delete server">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
