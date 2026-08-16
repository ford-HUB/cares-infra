import { formatRelativeTime } from '../../../constants/formatting'
import type {
  ChatContact,
  ChatPresence,
  ChatThreadSummary,
} from '../../../types/chat'
import { ChatAvatar } from './chat-avatar'

interface ChatContactRowProps {
  contact: ChatContact
  thread?: ChatThreadSummary
  presence: ChatPresence
  active: boolean
  onSelect: (contactId: string) => void
}

export function ChatContactRow({
  contact,
  thread,
  presence,
  active,
  onSelect,
}: ChatContactRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(contact.id)}
      aria-current={active ? 'true' : undefined}
      className={[
        'flex w-full items-center gap-2.5 rounded-[var(--cares-radius)] px-2 py-1.5 text-left transition-colors',
        active
          ? 'bg-[var(--cares-primary)]/10 ring-1 ring-[var(--cares-primary)]/25'
          : 'hover:bg-[var(--cares-bg)]',
      ].join(' ')}
    >
      <ChatAvatar
        firstName={contact.firstName}
        lastName={contact.lastName}
        presence={presence}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-[var(--cares-heading)]">
            {contact.firstName} {contact.lastName}
          </span>
          {thread && (
            <span className="shrink-0 text-[10px] text-[var(--cares-muted)]">
              {formatRelativeTime(thread.lastMessageAt)}
            </span>
          )}
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] text-[var(--cares-muted)]">
            {thread ? thread.preview : (contact.department ?? contact.email)}
          </span>
          {thread && thread.unread > 0 && (
            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[var(--cares-primary)] px-1 text-[10px] font-semibold text-white">
              {thread.unread}
            </span>
          )}
          {!thread && (
            <span className="shrink-0 text-[10px] text-[var(--cares-muted)]">
              No history
            </span>
          )}
        </span>
      </span>
    </button>
  )
}
