import { formatRelativeTime } from '../../../constants/formatting'
import type { NotificationItem } from '../../../types/notification'
import { StatusBadge } from './status-badge'

interface NotificationCardProps {
  item: NotificationItem
  onMarkRead?: (id: string) => void
}

export function NotificationCard({ item, onMarkRead }: NotificationCardProps) {
  const statusLabel = item.read ? 'Read' : 'Unread'

  return (
    <article
      className={[
        'rounded-[var(--cares-radius)] border bg-[var(--cares-card)] p-5 shadow-sm transition-shadow hover:shadow-md',
        item.read ? 'border-[var(--cares-border)]' : 'border-[var(--cares-primary)]/30',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-[var(--cares-heading)]">{item.title}</h3>
        <StatusBadge category={item.category} />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--cares-body)]">
        {item.description}
      </p>
      <div className="mt-4 flex items-center justify-between text-xs text-[var(--cares-muted)]">
        <span>
          {statusLabel} · {formatRelativeTime(item.createdAt)}
        </span>
        {!item.read && onMarkRead && (
          <button
            type="button"
            onClick={() => onMarkRead(item.id)}
            className="font-medium text-[var(--cares-primary)] hover:underline"
          >
            Mark as read
          </button>
        )}
      </div>
    </article>
  )
}
