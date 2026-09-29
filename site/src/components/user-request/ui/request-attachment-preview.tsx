import { ImageOff, Loader2, X } from 'lucide-react'
import { useAuthenticatedImage } from '../../../hooks/use-authenticated-image'
import type { UserRequestAttachment } from '../../../types/user-request'

interface RequestAttachmentPreviewProps {
  attachment: UserRequestAttachment
  onClose: () => void
}

/**
 * The proof files sit behind the bearer token, so a plain `<img src>` can't show
 * them — the hook fetches the bytes and hands back an object URL. A PDF proof of
 * residency opens in an embedded viewer instead of an image tag.
 */
export function RequestAttachmentPreview({
  attachment,
  onClose,
}: RequestAttachmentPreviewProps) {
  const { objectUrl, loading, failed } = useAuthenticatedImage(attachment.path)
  const isPdf = attachment.contentType === 'application/pdf'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">{attachment.label}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-[240px] flex-1 items-center justify-center overflow-auto bg-gray-50 p-4">
          {loading && <Loader2 className="h-6 w-6 animate-spin text-gray-400" />}
          {failed && (
            <div className="text-center">
              <ImageOff className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">The file could not be loaded.</p>
            </div>
          )}
          {objectUrl && isPdf && (
            <iframe
              src={objectUrl}
              title={attachment.label}
              className="h-[75vh] w-full rounded-lg bg-white"
            />
          )}
          {objectUrl && !isPdf && (
            <img
              src={objectUrl}
              alt={attachment.label}
              className="max-h-[75vh] max-w-full rounded-lg object-contain"
            />
          )}
        </div>
      </div>
    </div>
  )
}
