import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { ServerSettingsPayload } from '../types/protocol'
import { useAppTheme } from '../hooks/useAppTheme'
import { WarningButton } from './Button'

type Tab = 'general' | 'security' | 'moderation'
type LaunchPhase = 'config' | 'launching' | 'ready' | 'error'

export interface ServerConfigModalProps {
  /**
   * 'pre-launch' — open before starting the server; shows config form then
   *                 a launch progress step and a "Server is ready" confirmation.
   * 'manage'      — open while connected as admin; live-edit of running server
   *                 settings (replaces old ServerSettingsModal).
   */
  mode: 'pre-launch' | 'manage'
  /** Whether ~/.nexum/server/server.toml already exists */
  isConfigured: boolean
  /** WS port the server will/is listening on (default 8080) */
  port: number
  /** Manage mode: current server settings received from WELCOME payload */
  settings?: ServerSettingsPayload | null
  /** Manage mode: called when user clicks Save */
  onSaveSettings?: (s: { name?: string; max_users?: number; max_users_per_voice_channel?: number; max_message_size?: number; join_password?: string }) => void
  /** Manage mode: called when user clicks Change Admin Password */
  onChangePassword?: () => void
  /** Pre-launch mode: called when user clicks Connect Now after server is ready */
  onConnectNow?: () => void
  onClose: () => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'security', label: 'Security' },
  { id: 'moderation', label: 'Moderation' },
]

const MAX_POLLS = 30

export default function ServerConfigModal({ mode, isConfigured, port, settings, onSaveSettings, onChangePassword, onConnectNow, onClose }: ServerConfigModalProps) {
  const { theme, tw } = useAppTheme()

  // ── Form state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [serverName, setServerName] = useState(settings?.name ?? 'My Nexum Server')
  const [maxUsers, setMaxUsers] = useState(settings?.max_users ?? 200)
  const [maxVoice, setMaxVoice] = useState(settings?.max_users_per_voice_channel ?? 100)
  const [maxMessage, setMaxMessage] = useState(settings?.max_message_size ?? 2000)
  const [adminPassword, setAdminPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // ── Private server / join password ──────────────────────────────────────────
  const [isPrivate, setIsPrivate] = useState(settings?.is_private ?? false)
  const [joinPassword, setJoinPassword] = useState('')
  const [joinPasswordError, setJoinPasswordError] = useState<string | null>(null)

  // ── Pre-launch password reset (isConfigured only) ─────────────────────────
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null)
  const [newPasswordSaved, setNewPasswordSaved] = useState(false)

  // ── Manage-mode save flash ───────────────────────────────────────────────────
  const [saved, setSaved] = useState(false)

  // ── Pre-launch phase state machine ──────────────────────────────────────────
  const [phase, setPhase] = useState<LaunchPhase>('config')
  const [launchError, setLaunchError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCount = useRef(0)

  // Sync form fields when settings prop updates (manage mode)
  useEffect(() => {
    if (settings) {
      setServerName(settings.name)
      setMaxUsers(settings.max_users)
      setMaxVoice(settings.max_users_per_voice_channel)
      setMaxMessage(settings.max_message_size)
      setIsPrivate(settings.is_private)
    }
  }, [settings])

  // Cleanup poll interval on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let pwd = ''
    for (let i = 0; i < 16; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    setAdminPassword(pwd)
    setPasswordError(null)
  }

  const generateNewPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let pwd = ''
    for (let i = 0; i < 16; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    setNewAdminPassword(pwd)
    setNewPasswordError(null)
    setNewPasswordSaved(false)
  }

  const handleUpdatePassword = async () => {
    if (!newAdminPassword || newAdminPassword.length < 8) {
      setNewPasswordError('Password must be at least 8 characters.')
      return
    }
    try {
      await invoke('update_server_admin_password', { newPassword: newAdminPassword })
      setNewPasswordSaved(true)
      setNewPasswordError(null)
    } catch (err) {
      setNewPasswordError(String(err))
    }
  }

  // ── Launch flow (pre-launch mode) ───────────────────────────────────────────
  const handleLaunch = async () => {
    // Validate password required on first-time setup
    if (!isConfigured) {
      if (!adminPassword || adminPassword.length < 8) {
        setActiveTab('security')
        setPasswordError('Password must be at least 8 characters.')
        return
      }
    }
    // Validate join password when private
    if (isPrivate && !joinPassword.trim()) {
      setActiveTab('security')
      setJoinPasswordError('Please enter a join password for the private server.')
      return
    }

    setLaunchError(null)
    setPhase('launching')

    try {
      if (!isConfigured) {
        // Write server.toml with initial values (name, limits, password)
        await invoke('write_initial_server_config', {
          name: serverName.trim() || 'My Nexum Server',
          maxUsers,
          maxVoice,
          maxMessage,
          adminPassword,
          joinPassword: isPrivate ? joinPassword.trim() : '',
        })
        // Server reads from the toml we just wrote — no need to pass adminPassword again
        await invoke('start_local_server', { adminPassword: null })
      } else {
        // Already configured: apply pending password reset if any
        if (newAdminPassword && !newPasswordSaved) {
          if (newAdminPassword.length < 8) {
            setPhase('config')
            setActiveTab('security')
            setNewPasswordError('Password must be at least 8 characters.')
            setShowPasswordReset(true)
            return
          }
          await invoke('update_server_admin_password', { newPassword: newAdminPassword })
        }
        // Launch without rewriting config
        await invoke('start_local_server', { adminPassword: null })
      }

      // Poll until server accepts TCP connections
      pollCount.current = 0
      pollRef.current = setInterval(async () => {
        pollCount.current++

        if (pollCount.current > MAX_POLLS) {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setPhase('error')
          setLaunchError('Server did not become ready within 30 seconds.')
          return
        }

        try {
          // First check process is still alive
          const alive = await invoke<boolean>('check_server_health')
          if (!alive) {
            clearInterval(pollRef.current!)
            pollRef.current = null
            setPhase('error')
            setLaunchError('Server process exited unexpectedly. Check that the port is not already in use.')
            return
          }

          // Then check it's accepting TCP connections on the WS port
          const ready = await invoke<boolean>('check_server_ready', { port })
          if (ready) {
            clearInterval(pollRef.current!)
            pollRef.current = null
            setPhase('ready')
          }
        } catch {
          // Continue polling — transient invoke errors are expected during startup
        }
      }, 1000)
    } catch (err) {
      setPhase('error')
      setLaunchError(String(err))
    }
  }

  // ── Manage-mode save ─────────────────────────────────────────────────────────
  const handleSave = () => {
    onSaveSettings?.({
      name: serverName.trim() || undefined,
      max_users: maxUsers,
      max_users_per_voice_channel: maxVoice,
      max_message_size: maxMessage,
      // Send join_password field to update privacy: empty = public, non-empty = private
      join_password: isPrivate ? joinPassword.trim() || undefined : '',
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: theme.overlay }}>
      <div className={`${tw.bgCard} rounded-lg w-[560px] max-h-[85vh] flex flex-col shadow-xl border ${tw.borderDefault}`}>
        {/* ── Header ── */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${tw.borderDefault} shrink-0`}>
          <h2 className={`text-lg font-semibold ${tw.textPrimary} flex items-center gap-2`}>
            <svg className={`w-5 h-5 ${tw.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {mode === 'pre-launch' ? 'Server Configuration' : 'Server Settings'}
          </h2>
          {/* Don't allow closing while server is starting */}
          {phase !== 'launching' && (
            <button onClick={onClose} className={`${tw.textTertiary} hover:${tw.textPrimary} transition-colors cursor-pointer`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Launching overlay ── */}
        {phase === 'launching' && (
          <div className="flex-1 flex flex-col items-center justify-center py-14 px-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-5"></div>
            <p className={`text-base font-semibold ${tw.textPrimary}`}>Starting server…</p>
            <p className={`text-sm ${tw.textTertiary} mt-1`}>Waiting for it to accept connections</p>
          </div>
        )}

        {/* ── Ready state ── */}
        {phase === 'ready' && (
          <div className="flex-1 flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className={`text-base font-semibold ${tw.textPrimary} mb-1`}>Server is ready!</p>
            <p className={`text-sm ${tw.textTertiary} mb-7`}>
              Listening on{' '}
              <span className="font-mono" style={{ color: theme.status.success }}>
                localhost:{port}
              </span>
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className={`px-4 py-2 ${tw.btnSecondary} ${tw.textPrimary} rounded-md text-sm transition-colors cursor-pointer`}>
                Close
              </button>
              {onConnectNow && (
                <button
                  onClick={() => {
                    onConnectNow()
                    onClose()
                  }}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2">
                  Connect Now
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Error state ── */}
        {phase === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className={`text-base font-semibold ${tw.textPrimary} mb-2`}>Launch failed</p>
            <p className={`text-sm ${tw.textTertiary} mb-7 max-w-sm`}>{launchError}</p>
            <button
              onClick={() => {
                setPhase('config')
                setLaunchError(null)
              }}
              className={`px-5 py-2 ${tw.btnSecondary} ${tw.textPrimary} rounded-md text-sm font-medium transition-colors cursor-pointer`}>
              Try Again
            </button>
          </div>
        )}

        {/* ── Config form — visible in manage mode always, and in pre-launch while phase='config' ── */}
        {(phase === 'config' || mode === 'manage') && (
          <>
            {/* Tabs */}
            <div className={`flex border-b ${tw.borderDefault} px-6 shrink-0`}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 mr-5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                    activeTab === tab.id ? `border-white/60 ${tw.textPrimary}` : `border-transparent ${tw.textTertiary} hover:${tw.textSecondary}`
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* ── General tab ── */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${tw.textSecondary} mb-1`}>Server Name</label>
                    <input
                      type="text"
                      value={serverName}
                      onChange={e => setServerName(e.target.value)}
                      placeholder="My Nexum Server"
                      className={`w-full px-3 py-2 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none text-sm`}
                    />
                  </div>

                  <div className={`border-t ${tw.borderDefault} pt-4`}>
                    <h4 className={`text-sm font-medium ${tw.textSecondary} mb-3`}>Limits</h4>
                    <div className="space-y-3">
                      <div>
                        <label className={`block text-xs font-medium ${tw.textTertiary} mb-1`}>Max Users</label>
                        <input
                          type="number"
                          value={maxUsers}
                          min={1}
                          max={10000}
                          onChange={e => setMaxUsers(parseInt(e.target.value) || 1)}
                          className={`w-full px-3 py-2 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none text-sm`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium ${tw.textTertiary} mb-1`}>Max Users per Voice Channel</label>
                        <input
                          type="number"
                          value={maxVoice}
                          min={1}
                          max={1000}
                          onChange={e => setMaxVoice(parseInt(e.target.value) || 1)}
                          className={`w-full px-3 py-2 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none text-sm`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium ${tw.textTertiary} mb-1`}>Max Message Size (characters)</label>
                        <input
                          type="number"
                          value={maxMessage}
                          min={1}
                          max={100000}
                          onChange={e => setMaxMessage(parseInt(e.target.value) || 1)}
                          className={`w-full px-3 py-2 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none text-sm`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ports — manage mode only, read-only */}
                  {mode === 'manage' && settings && (
                    <div className={`border-t ${tw.borderDefault} pt-4`}>
                      <h4 className={`text-sm font-medium ${tw.textSecondary} mb-3`}>
                        Ports <span className={`text-xs font-normal ${tw.textTertiary}`}>(read-only, restart required to change)</span>
                      </h4>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className={`block text-xs ${tw.textTertiary} mb-1`}>WebSocket</label>
                          <input
                            type="number"
                            value={settings.ws_port}
                            disabled
                            className={`w-full px-3 py-2 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textTertiary} cursor-not-allowed text-sm opacity-60`}
                          />
                        </div>
                        <div className="flex-1">
                          <label className={`block text-xs ${tw.textTertiary} mb-1`}>UDP</label>
                          <input
                            type="number"
                            value={settings.udp_port}
                            disabled
                            className={`w-full px-3 py-2 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textTertiary} cursor-not-allowed text-sm opacity-60`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Security tab ── */}
              {activeTab === 'security' && (
                <div className="space-y-4">
                  {/* Pre-launch + first time: show password field */}
                  {mode === 'pre-launch' && !isConfigured && (
                    <div>
                      <label className={`block text-sm font-medium ${tw.textSecondary} mb-1`}>Admin Password</label>
                      <p className={`text-xs ${tw.textTertiary} mb-2`}>Required to authenticate as admin from the connected client. Store it somewhere safe.</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={adminPassword}
                          onChange={e => {
                            setAdminPassword(e.target.value)
                            setPasswordError(null)
                          }}
                          placeholder="Enter or generate a password"
                          className={`flex-1 px-3 py-2 ${tw.bgInput} border ${passwordError ? 'border-red-500' : tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none text-sm font-mono`}
                        />
                        <button onClick={generatePassword} className={`px-3 py-2 ${tw.btnSecondary} ${tw.textPrimary} rounded-md text-sm transition-colors cursor-pointer`}>
                          Generate
                        </button>
                      </div>
                      {passwordError && <p className="text-xs text-red-400 mt-1">{passwordError}</p>}
                    </div>
                  )}

                  {/* Pre-launch + already configured: info note + reset form */}
                  {mode === 'pre-launch' && isConfigured && (
                    <div>
                      <div className={`p-4 ${tw.bgInput} rounded-lg border ${tw.borderDefault} mb-4`}>
                        <div className="flex items-start gap-3">
                          <svg className={`w-5 h-5 ${tw.textTertiary} mt-0.5 shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className={`text-sm font-medium ${tw.textSecondary}`}>Server already configured</p>
                            <p className={`text-xs ${tw.textTertiary} mt-1`}>Admin password will remain unchanged unless you reset it below.</p>
                          </div>
                        </div>
                      </div>

                      {!showPasswordReset ? (
                        <button onClick={() => setShowPasswordReset(true)} className={`flex items-center gap-2 px-3 py-2 text-sm ${tw.btnSecondary} ${tw.textPrimary} rounded-md transition-colors cursor-pointer`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                            />
                          </svg>
                          Reset Admin Password
                        </button>
                      ) : (
                        <div>
                          <label className={`block text-sm font-medium ${tw.textSecondary} mb-1`}>New Admin Password</label>
                          <div className="flex gap-2 mb-1">
                            <input
                              type="text"
                              value={newAdminPassword}
                              onChange={e => {
                                setNewAdminPassword(e.target.value)
                                setNewPasswordError(null)
                                setNewPasswordSaved(false)
                              }}
                              placeholder="New password (min 8 characters)"
                              className={`flex-1 px-3 py-2 ${tw.bgInput} border ${newPasswordError ? 'border-red-500' : tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none text-sm font-mono`}
                            />
                            <button onClick={generateNewPassword} className={`px-3 py-2 ${tw.btnSecondary} ${tw.textPrimary} rounded-md text-sm transition-colors cursor-pointer`}>
                              Generate
                            </button>
                          </div>
                          {newPasswordError && <p className="text-xs text-red-400 mb-2">{newPasswordError}</p>}
                          {newPasswordSaved && <p className="text-xs text-green-400 mb-2">✓ Password updated — will take effect on next launch.</p>}
                          <div className="flex gap-2">
                            <button onClick={handleUpdatePassword} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors cursor-pointer">
                              Update Password
                            </button>
                            <button
                              onClick={() => {
                                setShowPasswordReset(false)
                                setNewAdminPassword('')
                                setNewPasswordError(null)
                                setNewPasswordSaved(false)
                              }}
                              className={`px-3 py-2 ${tw.btnSecondary} ${tw.textPrimary} rounded-md text-sm transition-colors cursor-pointer`}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manage mode: change password button */}
                  {mode === 'manage' && (
                    <div>
                      <p className={`text-xs ${tw.textTertiary} mb-3`}>Changing the admin password requires stopping and relaunching the server.</p>
                      <WarningButton onClick={onChangePassword} fullWidth>
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                            />
                          </svg>
                          Change Admin Password
                        </div>
                      </WarningButton>
                    </div>
                  )}

                  {/* ── Private server / Join password ── */}
                  <div className={`border-t ${tw.borderDefault} pt-4`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className={`text-sm font-medium ${tw.textSecondary}`}>Private Server</p>
                        <p className={`text-xs ${tw.textTertiary} mt-0.5`}>Require a password for guests to join your server.</p>
                      </div>
                      {/* Toggle switch */}
                      <button
                        onClick={() => {
                          setIsPrivate(v => !v)
                          setJoinPasswordError(null)
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer focus:outline-none mt-0.5 ${
                          isPrivate ? 'bg-blue-600' : tw.bgInput
                        }`}>
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${isPrivate ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {isPrivate && (
                      <div className="mt-2">
                        <label className={`block text-xs font-medium ${tw.textTertiary} mb-1`}>{mode === 'manage' ? 'New Join Password' : 'Join Password'}</label>
                        <input
                          type="text"
                          value={joinPassword}
                          onChange={e => {
                            setJoinPassword(e.target.value)
                            setJoinPasswordError(null)
                          }}
                          placeholder={mode === 'manage' ? 'Enter new join password (leave empty to keep current)' : 'Password guests must enter to join'}
                          className={`w-full px-3 py-2 ${tw.bgInput} border ${joinPasswordError ? 'border-red-500' : tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none text-sm font-mono`}
                        />
                        {joinPasswordError && <p className="text-xs text-red-400 mt-1">{joinPasswordError}</p>}
                        {mode === 'manage' && <p className={`text-xs ${tw.textTertiary} mt-1`}>Leave empty to keep the existing join password unchanged.</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Moderation tab ── */}
              {activeTab === 'moderation' && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <svg className={`w-10 h-10 ${tw.textMuted} mb-3`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <p className={`text-sm font-medium ${tw.textSecondary}`}>Moderation tools</p>
                  <p className={`text-xs ${tw.textTertiary} mt-1`}>Coming in v0.5.12 — kick, ban, mute users</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`flex justify-end gap-3 px-6 py-4 border-t ${tw.borderDefault} shrink-0`}>
              <button onClick={onClose} className={`px-4 py-2 ${tw.btnSecondary} ${tw.textPrimary} rounded-md text-sm transition-colors cursor-pointer`}>
                {mode === 'manage' ? 'Close' : 'Cancel'}
              </button>

              {mode === 'manage' && (
                <button
                  onClick={handleSave}
                  className={`px-5 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${saved ? '' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                  style={saved ? { backgroundColor: theme.status.success, color: 'white' } : {}}>
                  {saved ? '✓ Saved' : 'Save Changes'}
                </button>
              )}

              {mode === 'pre-launch' && (
                <button onClick={handleLaunch} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Launch Server
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
