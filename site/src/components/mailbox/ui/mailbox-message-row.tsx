import { Paperclip, Star } from 'lucide-react'
import { formatMailTimestamp } from '../../../constants/mailbox'
import type { MailSummary } from '../../../types/mailbox'

interface MailboxMessageRowProps {
  message: MailSummary
  active: boolean
  onSelect: (id: string) => void
}

/** Height is fixed at `h-[68px]` so the list skeleton can mirror it exactly. */
export function MailboxMessageRow({
  message,
  active,
  onSelect,
}: MailboxMessageRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(message.id)}
      aria-current={active ? 'true' : undefined}
      className={`flex h-[68px] w-full flex-col justify-center gap-0.5 border-b border-[var(--cares-border)] px-3 text-left transition ${
        active ? 'bg-[var(--cares-bg)]' : 'hover:bg-[var(--cares-bg)]'
      }`}
    >
      <div className="flex items-center gap-2">
        {message.unread && (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--cares-primary)]"
            aria-label="Unread"
          />
        )}
        <span
          className={`min-w-0 flex-1 truncate text-xs ${
            message.unread
              ? 'font-semibold text-[var(--cares-heading)]'
              : 'text-[var(--cares-body)]'
          }`}
        >
          {message.fromName || message.fromEmail}
        </span>
        {message.starred && (
          <Star size={12} className="shrink-0 fill-amber-400 text-amber-400" />
        )}
        {message.hasAttachments && (
          <Paperclip size={12} className="shrink-0 text-[var(--cares-muted)]" />
        )}
        <span className="shrink-0 text-[10px] text-[var(--cares-muted)]">
          {formatMailTimestamp(message.receivedAt)}
        </span>
      </div>

      <span
        className={`truncate text-xs ${
          message.unread
            ? 'font-medium text-[var(--cares-heading)]'
            : 'text-[var(--cares-body)]'
        }`}
      >
        {message.subject}
      </span>
      <span className="truncate text-[11px] text-[var(--cares-muted)]">
        {message.snippet}
      </span>
    </button>
  )
}
