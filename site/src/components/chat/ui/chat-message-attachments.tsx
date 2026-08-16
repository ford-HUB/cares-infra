import { Download, FileText } from 'lucide-react'
import { Skeleton } from '../../ui/skeleton'
import { formatFileSize } from '../../../constants/formatting'
import { useChatAttachmentUrl } from '../../../hooks/use-chat-attachment-url'
import type { ChatAttachment } from '../../../types/chat'

interface ChatMessageAttachmentsProps {
  attachments: ChatAttachment[]
  outgoing: boolean
}

function AttachmentImage({ attachment }: { attachment: ChatAttachment }) {
  const { objectUrl, failed } = useChatAttachmentUrl(attachment.id)

  if (failed) return <AttachmentFile attachment={attachment} outgoing={false} />
  if (!objectUrl) return <Skeleton className="h-32 w-full rounded" />

  return (
    <img
      src={objectUrl}
      alt={attachment.name}
      className="max-h-40 w-full rounded object-cover"
    />
  )
}

function AttachmentFile({
  attachment,
  outgoing,
}: {
  attachment: ChatAttachment
  outgoing: boolean
}) {
  const { objectUrl } = useChatAttachmentUrl(attachment.id)

  return (
    <a
      href={objectUrl ?? undefined}
      target="_blank"
      rel="noreferrer"
      className={[
        'flex items-center gap-2 rounded px-2 py-1.5 transition-opacity hover:opacity-90',
        outgoing ? 'bg-white/15' : 'bg-[var(--cares-bg)]',
        objectUrl ? '' : 'pointer-events-none opacity-70',
      ].join(' ')}
    >
      <FileText size={14} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-medium">
          {attachment.name}
        </span>
        <span className="block text-[10px] opacity-75">
          {formatFileSize(attachment.size)}
        </span>
      </span>
      <Download size={12} className="shrink-0 opacity-75" />
    </a>
  )
}

export function ChatMessageAttachments({
  attachments,
  outgoing,
}: ChatMessageAttachmentsProps) {
  return (
    <div className="mt-1.5 space-y-1.5">
      {attachments.map((attachment) =>
        attachment.mimeType.startsWith('image/') ? (
          <AttachmentImage key={attachment.id} attachment={attachment} />
        ) : (
          <AttachmentFile
            key={attachment.id}
            attachment={attachment}
            outgoing={outgoing}
          />
        ),
      )}
    </div>
  )
}
