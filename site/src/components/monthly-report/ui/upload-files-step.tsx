import { useRef, useState } from 'react'
import { CloudUpload, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize } from '../../../constants/formatting'
import {
  REPORT_DOCUMENT_ACCEPT,
  REPORT_DOCUMENT_FORMAT_HINT,
  REPORT_DOCUMENT_MAX_BYTES,
  REPORT_DOCUMENT_MAX_COUNT,
} from '../../../constants/monthly-report'
import type { UploadAttachment } from '../../../hooks/use-upload-report-form'

interface UploadFilesStepProps {
  attachments: UploadAttachment[]
  disabled: boolean
  onAddFiles: (files: FileList | File[]) => void
  onRemove: (id: string) => void
}

/**
 * The upload page: a cloud, a dashed drop area with a browse link, and one row per
 * file with its read progress and an × to take it back out. The look follows the
 * portal's upload reference — centred, quiet, the list doing the talking.
 */
export function UploadFilesStep({
  attachments,
  disabled,
  onAddFiles,
  onRemove,
}: UploadFilesStepProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const full = attachments.length >= REPORT_DOCUMENT_MAX_COUNT

  const openPicker = () => {
    if (!disabled && !full) inputRef.current?.click()
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center">
      <span className="flex h-16 w-16 items-center justify-center text-[var(--cares-primary)]">
        <CloudUpload className="h-14 w-14" strokeWidth={1.25} />
      </span>
      <h2 className="mt-2 text-[17px] font-semibold text-gray-900">Upload files</h2>
      <p className="mt-1 text-center text-[13px] text-gray-500">
        {REPORT_DOCUMENT_FORMAT_HINT}
      </p>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={REPORT_DOCUMENT_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) onAddFiles(event.target.files)
          event.target.value = ''
        }}
      />

      <div
        role="button"
        tabIndex={disabled || full ? -1 : 0}
        aria-disabled={disabled || full}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openPicker()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled && !full) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!disabled && !full) onAddFiles(event.dataTransfer.files)
        }}
        className={cn(
          'mt-5 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
          dragging
            ? 'border-[var(--cares-primary)] bg-emerald-50/60'
            : 'border-[var(--cares-primary)]/35 bg-[var(--cares-primary)]/[0.04]',
          (disabled || full) && 'cursor-not-allowed opacity-60',
          !disabled && !full && 'cursor-pointer hover:bg-[var(--cares-primary)]/[0.07]',
        )}
      >
        <p className="text-[13px] text-gray-500">
          {full ? (
            `Up to ${REPORT_DOCUMENT_MAX_COUNT} files per report`
          ) : (
            <>
              Drag &amp; drop your file(s) here or{' '}
              <span className="font-semibold text-[var(--cares-primary)] underline underline-offset-2">
                browse
              </span>
            </>
          )}
        </p>
        <p className="mt-1 text-[11px] text-gray-400">
          Up to {formatFileSize(REPORT_DOCUMENT_MAX_BYTES)} each ·{' '}
          {attachments.length}/{REPORT_DOCUMENT_MAX_COUNT} added
        </p>
      </div>

      {attachments.length > 0 && (
        <ul className="mt-4 w-full divide-y divide-gray-100">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-3 py-3">
              <FileText className="h-5 w-5 shrink-0 text-gray-400" strokeWidth={1.5} />

              <span className="w-40 min-w-0 shrink-0">
                <span
                  title={attachment.file.name}
                  className="block truncate text-[13px] text-gray-800"
                >
                  {attachment.file.name}
                </span>
                {attachment.error ? (
                  <span className="block truncate text-[11px] text-red-600">
                    {attachment.error}
                  </span>
                ) : (
                  <span className="block text-[11px] text-gray-400 tabular-nums">
                    {formatFileSize(attachment.file.size)}
                  </span>
                )}
              </span>

              {/* The bar only shows while there is something to show — a file that
                  has finished reading just sits ready, like the last row in the reference. */}
              {!attachment.error && attachment.progress < 100 ? (
                <>
                  <span
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={attachment.progress}
                    aria-label={`Reading ${attachment.file.name}`}
                    className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--cares-primary)]/15"
                  >
                    <span
                      className="block h-full rounded-full bg-[var(--cares-primary)] transition-[width] duration-200"
                      style={{ width: `${attachment.progress}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right text-[12px] text-gray-500 tabular-nums">
                    {attachment.progress}%
                  </span>
                </>
              ) : (
                <span className="min-w-0 flex-1" />
              )}

              <button
                type="button"
                aria-label={`Remove ${attachment.file.name}`}
                disabled={disabled}
                onClick={() => onRemove(attachment.id)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-[var(--cares-primary)]/10 hover:text-[var(--cares-primary)] focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
