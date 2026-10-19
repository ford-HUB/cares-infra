import { Download, FileText, ImageOff, Loader2, X } from 'lucide-react'
import { useAuthenticatedImage } from '../../../hooks/use-authenticated-image'
import type { UserRequestAttachment } from '../../../types/user-request'

interface RequestAttachmentPreviewProps {
  /** Only what the viewer needs, so assistance-request files can open here too. */
  attachment: Pick<UserRequestAttachment, 'label' | 'path' | 'contentType'> &
    Partial<Pick<UserRequestAttachment, 'fileName'>>
  onClose: () => void
}

/**
 * The proof files sit behind the bearer token, so a plain `<img src>` can't show
 * them — the hook fetches the bytes and hands back an object URL. A PDF opens in an
 * embedded viewer; any other non-image file (a beneficiary's supporting document can
 * be any type) gets a download button instead of a broken image.
 */
export function RequestAttachmentPreview({
  attachment,
  onClose,
}: RequestAttachmentPreviewProps) {
  const { objectUrl, loading, failed } = useAuthenticatedImage(attachment.path)
  const contentType = attachment.contentType
  const isPdf = contentType === 'application/pdf'
  // Untyped files are the ID and selfie captures, which are always images.
  const isImage = !contentType || contentType.startsWith('image/')
  const downloadName = attachment.fileName ?? attachment.label

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
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{attachment.label}</h3>
            {attachment.fileName && (
              <p className="truncate text-xs text-gray-500">{attachment.fileName}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {objectUrl && (
              <a
                href={objectUrl}
                download={downloadName}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
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
          {objectUrl && isImage && (
            <img
              src={objectUrl}
              alt={attachment.label}
              className="max-h-[75vh] max-w-full rounded-lg object-contain"
            />
          )}
          {objectUrl && !isPdf && !isImage && (
            <div className="text-center">
              <FileText className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-600">
                This file type can't be previewed here.
              </p>
              <a
                href={objectUrl}
                download={downloadName}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--cares-primary)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
              >
                <Download className="h-4 w-4" />
                Download {attachment.fileName ?? 'file'}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
