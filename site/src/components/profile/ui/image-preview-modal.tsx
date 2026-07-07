import { X } from 'lucide-react'
import { useEffect } from 'react'

interface ImagePreviewModalProps {
  open: boolean
  imageUrl: string | null
  title: string
  variant?: 'avatar' | 'signature'
  onClose: () => void
}

export function ImagePreviewModal({
  open,
  imageUrl,
  title,
  variant = 'avatar',
  onClose,
}: ImagePreviewModalProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !imageUrl) return null

  const isAvatar = variant === 'avatar'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="relative max-h-[85vh] w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-center rounded-lg bg-gray-50 p-4">
          <img
            src={imageUrl}
            alt={title}
            className={
              isAvatar
                ? 'h-64 w-64 rounded-full border border-gray-200 object-cover'
                : 'max-h-64 max-w-full rounded-lg border border-gray-200 bg-white object-contain p-2'
            }
          />
        </div>
      </div>
    </div>
  )
}
