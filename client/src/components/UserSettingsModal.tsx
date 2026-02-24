import { useAppTheme } from '../hooks/useAppTheme'
import { SecondaryButton } from './Button'

interface UserSettingsModalProps {
  onClose: () => void
  onChangeAvatar: () => void
}

export default function UserSettingsModal({ onClose, onChangeAvatar }: UserSettingsModalProps) {
  const { theme, tw } = useAppTheme()
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60]" style={{ backgroundColor: theme.overlay }}>
      <div className={`${tw.bgCard} rounded-lg p-6 w-[480px] shadow-2xl border ${tw.borderDefault}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-semibold ${tw.textPrimary} flex items-center gap-2`}>
            <svg className={`w-6 h-6 ${tw.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile
          </h2>
          <button onClick={onClose} className={`${tw.textTertiary} hover:${tw.textPrimary} transition-colors cursor-pointer`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-2">
          {/* Change Avatar Option */}
          <button
            onClick={() => {
              onChangeAvatar()
              onClose()
            }}
            className={`w-full px-4 py-3 ${tw.bgHeader} border ${tw.borderSubtle} ${tw.bgHoverSubtle} text-left ${tw.textPrimary} rounded-md transition-colors flex items-center gap-3 group cursor-pointer`}>
            <div className={`w-10 h-10 rounded-full ${tw.bgInput} border ${tw.borderSubtle} flex items-center justify-center ${tw.bgHover} transition-colors`}>
              <svg className={`w-5 h-5 ${tw.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Change Avatar</p>
              <p className={`text-sm ${tw.textTertiary}`}>Upload an image or use a URL</p>
            </div>
          </button>

          {/* Future settings can be added here */}
        </div>

        <div className="mt-6 flex justify-end">
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
        </div>
      </div>
    </div>
  )
}
