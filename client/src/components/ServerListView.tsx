import { useState } from 'react'
import { SavedServer } from '../types/server'

interface ServerListViewProps {
  servers: SavedServer[]
  onSelectServer: (server: SavedServer) => void
  onAddServer: () => void
  onDeleteServer: (serverId: string) => void
  onLaunchLocalServer: () => void
  onOpenClientSettings: () => void
  localServerStatus: { installed: boolean; running: boolean }
}

export default function ServerListView({ servers, onSelectServer, onAddServer, onDeleteServer, onLaunchLocalServer, onOpenClientSettings, localServerStatus }: ServerListViewProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  return (
    <div className="flex flex-col w-full h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-gray-800 border-b border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-white">Voice MVP</h1>
          <p className="text-sm text-gray-400 mt-1">Secure voice and text communication</p>
        </div>

        {/* Client Settings Button */}
        <button onClick={onOpenClientSettings} className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="Client Settings">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Local Server Section */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                  Local Server
                </h2>
                <p className="text-sm text-gray-400 mt-1">{localServerStatus.installed ? (localServerStatus.running ? 'Server is running' : 'Server is installed') : 'Server not found'}</p>
              </div>

              <button
                onClick={onLaunchLocalServer}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  localServerStatus.installed ? (localServerStatus.running ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white') : 'bg-gray-600 hover:bg-gray-500 text-white'
                }`}>
                {localServerStatus.installed ? (localServerStatus.running ? 'Configure' : 'Launch Server') : 'Download Server'}
              </button>
            </div>
          </div>

          {/* Servers List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Your Servers</h2>
              <button onClick={onAddServer} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-md transition-colors flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Server
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
                <p className="text-gray-500 text-sm">Add a server to get started</p>
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
                        <button onClick={() => onSelectServer(server)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-md transition-colors">
                          Connect
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
