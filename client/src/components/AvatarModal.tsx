import { useState, useRef } from 'react'
import { useAppTheme } from '../hooks/useAppTheme'
import { PrimaryButton, SecondaryButton, CancelButton } from './Button'

interface AvatarModalProps {
  currentAvatar?: string | null
  serverAddress: string // e.g., "localhost:8080"
  sessionId: string
  userId: string
  onClose: () => void
  onSave: (avatarUrl: string | null) => void
}

type TabType = 'upload' | 'url'

const MAX_FILE_SIZE = 200 * 1024 // 200KB
const AVATAR_SIZE = 256 // 256x256 pixels

export default function AvatarModal({ currentAvatar, serverAddress, sessionId, userId, onClose, onSave }: AvatarModalProps) {
  const { theme, tw } = useAppTheme()
  const [activeTab, setActiveTab] = useState<TabType>('upload')
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar || '')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingImage, setProcessingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const compressAndResizeImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = e => {
        const img = new Image()
        img.onload = () => {
          // Create canvas
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          // Calculate crop dimensions (center crop to square)
          const size = Math.min(img.width, img.height)
          const x = (img.width - size) / 2
          const y = (img.height - size) / 2

          // Set canvas size to target size
          canvas.width = AVATAR_SIZE
          canvas.height = AVATAR_SIZE

          // Draw image centered and cropped
          ctx.drawImage(img, x, y, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE)

          // Try different quality levels to get under 200KB
          let quality = 0.85
          const tryCompress = () => {
            canvas.toBlob(
              blob => {
                if (!blob) {
                  reject(new Error('Failed to compress image'))
                  return
                }

                // Check if size is acceptable
                if (blob.size <= MAX_FILE_SIZE) {
                  resolve(blob)
                } else if (quality > 0.3) {
                  // Try with lower quality
                  quality -= 0.1
                  tryCompress()
                } else {
                  reject(new Error(`Image is too large even after compression (${(blob.size / 1024).toFixed(0)}KB). Please use a simpler image.`))
                }
              },
              'image/webp',
              quality,
            )
          }

          tryCompress()
        }

        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = e.target?.result as string
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = async (file: File) => {
    setError(null)
    setProcessingImage(true)

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file')
      }

      // Validate initial file size (must be reasonable to process)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File is too large to process (max 10MB for upload)')
      }

      // Compress and resize
      const compressedBlob = await compressAndResizeImage(file)

      // Create a File from the Blob
      const compressedFile = new File([compressedBlob], file.name.replace(/\.[^.]+$/, '.webp'), {
        type: 'image/webp',
      })

      setSelectedFile(compressedFile)

      // Create preview
      const previewReader = new FileReader()
      previewReader.onload = e => {
        setPreviewUrl(e.target?.result as string)
      }
      previewReader.readAsDataURL(compressedBlob)
    } catch (err: any) {
      setError(err.message || 'Failed to process image')
      setSelectedFile(null)
      setPreviewUrl(null)
    } finally {
      setProcessingImage(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      await handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleSave = async () => {
    setError(null)

    if (activeTab === 'upload' && selectedFile) {
      // Upload file to server
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('avatar', selectedFile)

        const response = await fetch(`http://${serverAddress}/api/users/${userId}/avatar`, {
          method: 'POST',
          headers: {
            Authorization: `Session ${sessionId}`,
          },
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to upload avatar')
        }

        const data = await response.json()
        // The avatar path will be something like "avatars/{userId}.webp"
        // Pass the relative path so each client resolves it via their own serverAddress
        onSave(data.avatar_path)
        onClose()
      } catch (err: any) {
        setError(err.message || 'Failed to upload avatar')
      } finally {
        setUploading(false)
      }
    } else if (activeTab === 'url') {
      // Save URL directly
      onSave(avatarUrl.trim() || null)
      onClose()
    }
  }

  const handleClear = () => {
    setAvatarUrl('')
    setSelectedFile(null)
    setPreviewUrl(null)
    setError(null)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[70] p-4" style={{ backgroundColor: theme.overlay }}>
      <div className={`${tw.bgCard} rounded-lg p-6 w-[520px] shadow-2xl border ${tw.borderDefault}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-semibold ${tw.textPrimary} flex items-center gap-2`}>
            <svg className={`w-6 h-6 ${tw.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Change Avatar
          </h2>
          <button onClick={onClose} className={`${tw.textTertiary} hover:${tw.textPrimary} transition-colors`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex gap-2 mb-4 border-b ${tw.borderDefault}`}>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 font-medium transition-colors ${activeTab === 'upload' ? `${tw.textPrimary} border-b-2 border-blue-500` : `${tw.textTertiary} hover:${tw.textSecondary}`}`}>
            Upload File
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`px-4 py-2 font-medium transition-colors ${activeTab === 'url' ? `${tw.textPrimary} border-b-2 border-blue-500` : `${tw.textTertiary} hover:${tw.textSecondary}`}`}>
            Use URL
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'upload' && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => !processingImage && fileInputRef.current?.click()}
                className={`border-2 border-dashed ${tw.borderDefault} rounded-lg p-8 text-center ${processingImage ? 'cursor-wait opacity-75' : `cursor-pointer ${tw.bgHover}`} transition-colors`}
                style={{ backgroundColor: tw.bgInput }}>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" disabled={processingImage} />

                {processingImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className={`${tw.textPrimary} font-medium`}>Processing image...</p>
                    <p className={`text-sm ${tw.textTertiary}`}>Resizing and compressing...</p>
                  </div>
                ) : selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className={`${tw.textPrimary} font-medium`}>{selectedFile.name}</p>
                    <p className={`text-sm ${tw.textTertiary}`}>{(selectedFile.size / 1024).toFixed(0)} KB • 256x256px</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <svg className={`w-12 h-12 ${tw.textTertiary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className={`${tw.textPrimary} font-medium`}>Click or drag image here</p>
                    <p className={`text-sm ${tw.textTertiary}`}>Auto-compressed to 256x256 • Max 200KB</p>
                  </div>
                )}
              </div>

              {/* Preview for uploaded file */}
              {previewUrl && (
                <div className={`flex flex-col items-center p-4 ${tw.bgInput} rounded-md border ${tw.borderDefault}`}>
                  <p className={`text-sm ${tw.textSecondary} mb-3`}>Preview</p>
                  <div className={`w-24 h-24 rounded-full overflow-hidden ${tw.bgInput} border-2 ${tw.borderDefault}`}>
                    <img src={previewUrl} alt="Avatar preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'url' && (
            <>
              <div>
                <label className={`block text-sm font-medium ${tw.textSecondary} mb-2`}>Avatar URL</label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className={`w-full px-3 py-2 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none focus:border-gray-500`}
                  style={{ '--tw-ring-color': theme.border.focus } as React.CSSProperties}
                  autoFocus
                />
                <p className={`text-xs ${tw.textMuted} mt-1`}>Enter a publicly accessible image URL</p>
              </div>

              {/* Avatar Preview */}
              {avatarUrl && (
                <div className={`flex flex-col items-center p-4 ${tw.bgInput} rounded-md border ${tw.borderDefault}`}>
                  <p className={`text-sm ${tw.textSecondary} mb-3`}>Preview</p>
                  <div className={`w-24 h-24 rounded-full overflow-hidden ${tw.bgInput} border-2 ${tw.borderDefault}`}>
                    <img
                      src={avatarUrl}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                      onError={e => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        target.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                    <div className="hidden w-full h-full flex items-center justify-center text-gray-400 text-xs">Invalid URL</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-md">
              <p className="text-sm text-red-300 flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </p>
            </div>
          )}

          <div className={`p-3 ${tw.bgInput} border ${tw.borderDefault} rounded-md`}>
            <p className={`text-xs ${tw.textTertiary} flex items-start gap-2`}>
              <svg className={`w-4 h-4 ${tw.textMuted} mt-0.5 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Images are automatically resized to 256x256 and compressed to meet the 200KB limit. Upload any image and it will be optimized.</span>
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-between gap-3">
          <SecondaryButton onClick={handleClear} disabled={uploading || processingImage} size="sm">
            Clear
          </SecondaryButton>
          <div className="flex gap-3">
            <CancelButton onClick={onClose} disabled={uploading || processingImage} />
            <PrimaryButton onClick={handleSave} disabled={uploading || processingImage || (activeTab === 'upload' && !selectedFile) || (activeTab === 'url' && !avatarUrl.trim())}>
              {uploading ? 'Uploading...' : processingImage ? 'Processing...' : 'Save'}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  )
}
