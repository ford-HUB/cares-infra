import { Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PROFILE_IMAGE_ACCEPT } from '../../../constants/profile-upload'
import type { ProfileAssetKind } from '../../../hooks/use-authenticated-profile-asset'
import { useAuthenticatedProfileAsset } from '../../../hooks/use-authenticated-profile-asset'
import { ImagePreviewModal } from './image-preview-modal'

interface ImageUploadFieldProps {
  id: string
  label: string
  hint?: string
  localPreviewUrl: string | null
  remoteAsset?: ProfileAssetKind | null
  error?: string | null
  onChange: (file: File | null) => void
  variant?: 'avatar' | 'signature'
}

export function ImageUploadField({
  id,
  label,
  hint,
  localPreviewUrl,
  remoteAsset = null,
  error,
  onChange,
  variant = 'avatar',
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const isAvatar = variant === 'avatar'
  const { objectUrl: remotePreviewUrl } = useAuthenticatedProfileAsset(
    remoteAsset,
    Boolean(remoteAsset) && !localPreviewUrl,
  )
  const previewUrl = localPreviewUrl ?? remotePreviewUrl

  useEffect(() => {
    if (!localPreviewUrl && inputRef.current) {
      inputRef.current.value = ''
    }
  }, [localPreviewUrl])

  const handleFileChange = (file: File | null) => {
    onChange(file)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-700">{label}</p>
      {hint && <p className="mb-2 text-[10px] text-gray-500">{hint}</p>}

      <div className="flex items-center gap-3">
        {previewUrl ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className={`block cursor-zoom-in focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none ${
                isAvatar ? 'rounded-full' : 'rounded-lg'
              }`}
              aria-label={`View ${label}`}
            >
              <img
                src={previewUrl}
                alt={label}
                className={
                  isAvatar
                    ? 'h-20 w-20 rounded-full border border-gray-200 object-cover'
                    : 'h-16 max-w-[200px] rounded-lg border border-gray-200 bg-white object-contain p-1'
                }
              />
            </button>
            <button
              type="button"
              onClick={() => handleFileChange(null)}
              className="absolute -top-1 -right-1 rounded-full bg-white p-0.5 shadow ring-1 ring-gray-200"
              aria-label={`Remove ${label}`}
            >
              <X className="h-3 w-3 text-gray-600" />
            </button>
          </div>
        ) : (
          <div
            className={
              isAvatar
                ? 'flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50'
                : 'flex h-16 w-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50'
            }
          >
            <Upload className="h-4 w-4 text-gray-400" />
          </div>
        )}

        <label
          htmlFor={id}
          className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          {previewUrl ? 'Change' : 'Upload'}
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={PROFILE_IMAGE_ACCEPT}
            className="sr-only"
            onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {error && <p className="mt-1 text-[10px] text-red-600">{error}</p>}

      <ImagePreviewModal
        open={previewOpen}
        imageUrl={previewUrl}
        title={label}
        variant={variant}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  )
}
