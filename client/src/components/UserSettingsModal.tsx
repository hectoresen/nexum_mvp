import { theme, tw } from '../theme'
import { SecondaryButton } from './Button'

interface UserSettingsModalProps {
  onClose: () => void
  onChangeAvatar: () => void
}

export default function UserSettingsModal({ onClose, onChangeAvatar }: UserSettingsModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60]" style={{ backgroundColor: theme.overlay }}>
      <div className={`${tw.bgCard} rounded-lg p-6 w-[480px] shadow-2xl border ${tw.borderDefault}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-semibold ${tw.textPrimary} flex items-center gap-2`}>
            <svg className={`w-6 h-6 ${tw.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            User Settings
          </h2>
          <button onClick={onClose} className={`${tw.textTertiary} hover:${tw.textPrimary} transition-colors`}>
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
            className={`w-full px-4 py-3 ${tw.bgInput} ${tw.bgHoverSubtle} text-left ${tw.textPrimary} rounded-md transition-colors flex items-center gap-3 group`}>
            <div className={`w-10 h-10 rounded-full ${tw.bgInput} flex items-center justify-center ${tw.bgHover} transition-colors`}>
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
