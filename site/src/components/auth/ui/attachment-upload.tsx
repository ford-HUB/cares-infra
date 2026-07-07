import { FileText, Paperclip, X } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  REQUEST_ACCESS_ACCEPT_ATTR,
  REQUEST_ACCESS_MAX_FILES,
} from '../../../constants/request-access'
import { formatFileSize } from '../../../constants/formatting'

interface AttachmentUploadProps {
  files: File[]
  error: string | null
  onAdd: (files: FileList | null) => void
  onRemove: (index: number) => void
}

export function AttachmentUpload({
  files,
  error,
  onAdd,
  onRemove,
}: AttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    onAdd(e.dataTransfer.files)
  }

  return (
    <div>
      <label className="mb-0.5 block text-xs font-medium text-gray-700">
        Attachments (ID verification)
      </label>
      <p className="mb-1.5 text-[10px] leading-tight text-[var(--cares-muted)]">
        PDF, JPG, PNG, WebP, or DOC/DOCX · max {REQUEST_ACCESS_MAX_FILES} files · 5 MB each · no
        GIF/video/archive
      </p>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        className={[
          'flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2 transition-colors',
          dragging
            ? 'border-[var(--cares-primary)] bg-[var(--cares-tag-volunteer-bg)]'
            : 'border-[var(--cares-border)] bg-[var(--cares-bg)] hover:border-[var(--cares-primary)]',
        ].join(' ')}
      >
        <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--cares-primary)]" />
        <span className="text-[11px] text-[var(--cares-muted)]">
          Click or drag files here
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={REQUEST_ACCESS_ACCEPT_ATTR}
          className="sr-only"
          onChange={(e) => {
            onAdd(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {error && <p className="mt-1 text-[10px] text-red-600">{error}</p>}

      {files.length > 0 && (
        <ul className="mt-1.5 max-h-16 space-y-1 overflow-y-auto">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded border border-[var(--cares-border)] bg-white px-2 py-1"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <FileText className="h-3 w-3 shrink-0 text-[var(--cares-primary)]" />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-gray-900">{file.name}</p>
                  <p className="text-[10px] text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(index)
                }}
                className="rounded p-0.5 text-gray-500 hover:bg-gray-100"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
