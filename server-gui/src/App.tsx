import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface ServerConfig {
  serverName: string
  wsPort: number
  udpPort: number
  adminPassword: string
  maxUsers: number
}

enum ServerStatus {
  Stopped = 'stopped',
  Starting = 'starting',
  Running = 'running',
  Error = 'error',
}

function App() {
  const [status, setStatus] = useState<ServerStatus>(ServerStatus.Stopped)
  const [logs, setLogs] = useState<string[]>([])
  const [config, setConfig] = useState<ServerConfig>({
    serverName: 'My Voice Server',
    wsPort: 8080,
    udpPort: 9000,
    adminPassword: '',
    maxUsers: 200,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isFirstRun, setIsFirstRun] = useState(true)

  useEffect(() => {
    checkExistingConfig()
  }, [])

  const checkExistingConfig = async () => {
    try {
      const exists = await invoke<boolean>('config_exists')
      setIsFirstRun(!exists)

      if (exists) {
        // Load existing config (without password for security)
        const existingConfig = await invoke<ServerConfig>('load_config')
        setConfig({ ...existingConfig, adminPassword: '' })
      }
    } catch (error) {
      console.error('Error checking config:', error)
      addLog(`Error: ${error}`)
    }
  }

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const handleStartServer = async () => {
    if (!config.adminPassword && isFirstRun) {
      addLog('Error: Please set an admin password')
      return
    }

    try {
      setStatus(ServerStatus.Starting)
      addLog('Starting server...')

      await invoke('start_server', {
        config: {
          server_name: config.serverName,
          ws_port: config.wsPort,
          udp_port: config.udpPort,
          admin_password: config.adminPassword,
          max_users: config.maxUsers,
        },
      })

      setStatus(ServerStatus.Running)
      addLog('✅ Server started successfully')
      addLog(`WebSocket listening on port ${config.wsPort}`)
      addLog(`UDP listening on port ${config.udpPort}`)
      addLog(`Admin password: ${config.adminPassword}`)

      setIsFirstRun(false)
    } catch (error) {
      setStatus(ServerStatus.Error)
      addLog(`❌ Error starting server: ${error}`)
    }
  }

  const handleStopServer = async () => {
    try {
      addLog('Stopping server...')
      await invoke('stop_server')
      setStatus(ServerStatus.Stopped)
      addLog('Server stopped')
    } catch (error) {
      addLog(`Error stopping server: ${error}`)
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let password = ''
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setConfig({ ...config, adminPassword: password })
    addLog('Generated secure random password')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 flex items-center">
          <span className="mr-3">🎤</span>
          Voice Server Manager
        </h1>

        {/* Status Card */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Server Status</h2>
              <div className="flex items-center">
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${
                    status === ServerStatus.Running ? 'bg-green-500' : status === ServerStatus.Starting ? 'bg-yellow-500' : status === ServerStatus.Error ? 'bg-red-500' : 'bg-gray-500'
                  }`}></div>
                <span className="capitalize">{status}</span>
              </div>
            </div>

            <div className="flex gap-3">
              {status === ServerStatus.Stopped || status === ServerStatus.Error ? (
                <button onClick={handleStartServer} className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-md font-semibold transition" disabled={!config.adminPassword && isFirstRun}>
                  Start Server
                </button>
              ) : (
                <button onClick={handleStopServer} className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-md font-semibold transition" disabled={status === ServerStatus.Starting}>
                  Stop Server
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Server Configuration</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Server Name</label>
              <input
                type="text"
                value={config.serverName}
                onChange={e => setConfig({ ...config, serverName: e.target.value })}
                className="w-full bg-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={status === ServerStatus.Running}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Max Users</label>
              <input
                type="number"
                value={config.maxUsers}
                onChange={e => setConfig({ ...config, maxUsers: parseInt(e.target.value) })}
                className="w-full bg-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={status === ServerStatus.Running}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">WebSocket Port</label>
              <input
                type="number"
                value={config.wsPort}
                onChange={e => setConfig({ ...config, wsPort: parseInt(e.target.value) })}
                className="w-full bg-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={status === ServerStatus.Running}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">UDP Port</label>
              <input
                type="number"
                value={config.udpPort}
                onChange={e => setConfig({ ...config, udpPort: parseInt(e.target.value) })}
                className="w-full bg-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={status === ServerStatus.Running}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Admin Password {isFirstRun && <span className="text-red-500">*</span>}</label>
              <div className="flex gap-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={config.adminPassword}
                  onChange={e => setConfig({ ...config, adminPassword: e.target.value })}
                  placeholder={isFirstRun ? 'Required for first run' : 'Leave empty to keep current'}
                  className="flex-1 bg-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={status === ServerStatus.Running}
                />
                <button onClick={() => setShowPassword(!showPassword)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition" disabled={status === ServerStatus.Running}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
                <button onClick={generatePassword} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition" disabled={status === ServerStatus.Running}>
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Server Logs</h2>
          <div className="bg-gray-900 rounded p-4 h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
