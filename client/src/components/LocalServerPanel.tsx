import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface ServerInfo {
  status: 'notinstalled' | 'stopped' | 'starting' | 'running' | 'error'
  installed: boolean
  binary_path: string | null
  ws_port: number
  udp_port: number
  pid: number | null
}

interface LocalServerPanelProps {
  onServerStarted?: () => void
  onServerStopped?: () => void
}

export default function LocalServerPanel({ onServerStarted, onServerStopped }: LocalServerPanelProps) {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)

  // Initial detection on mount
  useEffect(() => {
    detectServer()
    checkIfConfigured()

    // Poll server status every 2 seconds
    const interval = setInterval(() => {
      if (serverInfo?.installed) {
        refreshStatus()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const detectServer = async () => {
    try {
      setLoading(true)
      setError(null)
      const info = await invoke<ServerInfo>('detect_local_server')
      setServerInfo(info)
    } catch (err) {
      setError(err as string)
    } finally {
      setLoading(false)
    }
  }

  const checkIfConfigured = async () => {
    try {
      const configured = await invoke<boolean>('is_server_configured')
      setIsConfigured(configured)
      if (!configured) {
        setShowPasswordInput(true)
      }
    } catch (err) {
      console.error('Failed to check configuration:', err)
    }
  }

  const refreshStatus = async () => {
    try {
      const info = await invoke<ServerInfo>('get_server_status')
      setServerInfo(info)

      // Check if process is still healthy
      if (info.status === 'running') {
        const healthy = await invoke<boolean>('check_server_health')
        if (!healthy && info.status === 'running') {
          // Server crashed
          setServerInfo({ ...info, status: 'stopped' })
        }
      }
    } catch (err) {
      console.error('Failed to refresh status:', err)
    }
  }

  const handleStart = async () => {
    try {
      setLoading(true)
      setError(null)

      // If not configured and no password provided
      if (!isConfigured && !adminPassword) {
        setError('Please enter an admin password to configure the server')
        setShowPasswordInput(true)
        return
      }

      // Start server with password if first time
      await invoke('start_local_server', {
        adminPassword: !isConfigured ? adminPassword : null,
      })

      // Update status
      await refreshStatus()

      if (onServerStarted) {
        onServerStarted()
      }

      // Mark as configured
      setIsConfigured(true)
      setShowPasswordInput(false)
      setAdminPassword('')
    } catch (err) {
      setError(err as string)
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    try {
      setLoading(true)
      setError(null)
      await invoke('stop_local_server')
      await refreshStatus()

      if (onServerStopped) {
        onServerStopped()
      }
    } catch (err) {
      setError(err as string)
    } finally {
      setLoading(false)
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let password = ''
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setAdminPassword(password)
  }

  if (loading && !serverInfo) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
          <span className="ml-3 text-slate-300">Detecting server...</span>
        </div>
      </div>
    )
  }

  if (!serverInfo?.installed) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">🖥️ Local Server</h3>
          <span className="text-xs text-slate-400">Not Installed</span>
        </div>
        <p className="text-sm text-slate-300 mb-3">The server binary is not installed on this system.</p>
        <div className="text-xs text-slate-400">Expected location: Same directory as client executable</div>
      </div>
    )
  }

  const statusConfig = {
    notinstalled: { color: 'bg-slate-500', label: 'Not Installed', textColor: 'text-slate-400' },
    stopped: { color: 'bg-gray-500', label: 'Stopped', textColor: 'text-gray-300' },
    starting: { color: 'bg-yellow-500', label: 'Starting...', textColor: 'text-yellow-300' },
    running: { color: 'bg-green-500', label: 'Running', textColor: 'text-green-300' },
    error: { color: 'bg-red-500', label: 'Error', textColor: 'text-red-300' },
  }

  const status = statusConfig[serverInfo.status]

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">🖥️ Local Server</h3>
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full ${status.color} mr-2 ${serverInfo.status === 'starting' ? 'animate-pulse' : ''}`}></div>
          <span className={`text-sm font-medium ${status.textColor}`}>{status.label}</span>
        </div>
      </div>

      {/* Error Display */}
      {error && <div className="mb-3 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">{error}</div>}

      {/* Server Info */}
      <div className="mb-4 space-y-2 text-sm">
        <div className="flex justify-between text-slate-300">
          <span>WebSocket Port:</span>
          <span className="font-mono">localhost:{serverInfo.ws_port}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>UDP Port:</span>
          <span className="font-mono">{serverInfo.udp_port}</span>
        </div>
        {serverInfo.pid && (
          <div className="flex justify-between text-slate-300">
            <span>Process ID:</span>
            <span className="font-mono">{serverInfo.pid}</span>
          </div>
        )}
      </div>

      {/* Password Input (First Time Setup) */}
      {showPasswordInput && !isConfigured && (
        <div className="mb-4 p-3 bg-slate-900 rounded border border-slate-600">
          <label className="block text-sm font-medium text-slate-300 mb-2">Admin Password (First Time Setup)</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              placeholder="Enter admin password"
              className="flex-1 bg-slate-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={loading}
            />
            <button onClick={generatePassword} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded text-sm font-medium transition disabled:opacity-50" disabled={loading}>
              Generate
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">This password will be required to authenticate as admin from the client.</p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-2">
        {serverInfo.status === 'stopped' || serverInfo.status === 'error' ? (
          <button onClick={handleStart} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded font-medium transition disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Starting...' : 'Start Server'}
          </button>
        ) : serverInfo.status === 'running' ? (
          <button onClick={handleStop} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded font-medium transition disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Stopping...' : 'Stop Server'}
          </button>
        ) : (
          <button disabled className="flex-1 bg-slate-600 text-slate-300 py-2 px-4 rounded font-medium cursor-not-allowed">
            Starting...
          </button>
        )}

        <button onClick={detectServer} disabled={loading} className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded font-medium transition disabled:opacity-50">
          🔄
        </button>
      </div>

      {/* Binary Path (Dev Info) */}
      {serverInfo.binary_path && (
        <div className="mt-3 text-xs text-slate-500 truncate" title={serverInfo.binary_path}>
          {serverInfo.binary_path}
        </div>
      )}
    </div>
  )
}
