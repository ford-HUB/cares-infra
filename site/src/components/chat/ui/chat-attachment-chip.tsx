import { FileText, X } from 'lucide-react'
import { formatFileSize } from '../../../constants/formatting'
import type { ChatDraftAttachment } from '../../../types/chat'

interface ChatAttachmentChipProps {
  attachment: ChatDraftAttachment
  onRemove: (id: string) => void
}

export function ChatAttachmentChip({
  attachment,
  onRemove,
}: ChatAttachmentChipProps) {
  return (
    <span className="flex items-center gap-2 rounded-[var(--cares-radius)] border border-[var(--cares-border)] bg-[var(--cares-bg)] py-1 pl-1 pr-1.5">
      {attachment.previewUrl ? (
        <img
          src={attachment.previewUrl}
          alt={attachment.name}
          className="h-7 w-7 rounded object-cover"
        />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded bg-[var(--cares-primary)]/10">
          <FileText size={14} className="text-[var(--cares-primary)]" />
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <span className="max-w-32 truncate text-[11px] font-medium text-[var(--cares-heading)]">
          {attachment.name}
        </span>
        <span className="text-[10px] text-[var(--cares-muted)]">
          {formatFileSize(attachment.size)}
        </span>
      </span>
      <button
        type="button"
        aria-label={`Remove ${attachment.name}`}
        onClick={() => onRemove(attachment.id)}
        className="rounded p-0.5 text-[var(--cares-muted)] hover:bg-[var(--cares-border)] hover:text-[var(--cares-heading)]"
      >
        <X size={12} />
      </button>
    </span>
  )
}
