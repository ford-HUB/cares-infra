import { ArrowUpRight, Check, Inbox, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  formatDateShort,
  formatRelativeTime,
  formatTimeOfDay,
} from '../../constants/formatting'
import {
  NOTIFICATION_CATEGORY_ICONS,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_TONE_CHIP_STYLES,
  NOTIFICATION_TONE_LABELS,
  NOTIFICATION_TONE_RAIL_STYLES,
  type NotificationDayGroup,
} from '../../constants/notifications'
import type { NotificationItem } from '../../types/notification'

interface NotificationFeedProps {
  groups: NotificationDayGroup[]
  /** History rows are older than a week: the clock column shows the date, not the hour. */
  variant: 'recent' | 'history'
  emptyMessage: string
  onMarkRead: (id: string) => void
  onDismiss: (id: string) => void
}

/**
 * One list, two registers. "This week" is grouped by day and reads like a timeline;
 * history is grouped by month and dimmed, because it is the record, not the inbox.
 */
export function NotificationFeed({
  groups,
  variant,
  emptyMessage,
  onMarkRead,
  onDismiss,
}: NotificationFeedProps) {
  if (groups.length === 0) {
    return (
      <Card className="py-10 text-center shadow-sm">
        <Inbox className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-3 text-[13px] text-gray-500">{emptyMessage}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.key}>
          <div className="mb-2 flex items-center gap-3">
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">
              {group.label}
            </p>
            <span aria-hidden className="h-px flex-1 bg-gray-200" />
            <p className="text-[11px] text-gray-400 tabular-nums">
              {group.items.length} {group.items.length === 1 ? 'notice' : 'notices'}
            </p>
          </div>

          <Card className="gap-0 py-0 shadow-sm">
            <ul className="divide-y divide-gray-100">
              {group.items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  variant={variant}
                  onMarkRead={onMarkRead}
                  onDismiss={onDismiss}
                />
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  )
}

interface NotificationRowProps {
  item: NotificationItem
  variant: NotificationFeedProps['variant']
  onMarkRead: (id: string) => void
  onDismiss: (id: string) => void
}

function NotificationRow({ item, variant, onMarkRead, onDismiss }: NotificationRowProps) {
  const Icon = NOTIFICATION_CATEGORY_ICONS[item.category]
  const settled = item.read
  const historic = variant === 'history'

  return (
    <li
      className={cn(
        'group flex gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50/70',
        !settled && 'bg-amber-50/30',
      )}
    >
      {/* The clock reads first — this week it is the hour, in history it is the date. */}
      <div className="w-16 shrink-0 pt-0.5 text-right">
        <p
          className={cn(
            'text-[12px] font-medium tabular-nums',
            settled ? 'text-gray-400' : 'text-gray-600',
          )}
        >
          {historic ? formatDateShort(item.createdAt) : formatTimeOfDay(item.createdAt)}
        </p>
        <p className="text-[11px] text-gray-400">{formatRelativeTime(item.createdAt)}</p>
      </div>

      {/* Tone reads before the title does — it is why the reader stopped on this row. */}
      <span
        aria-hidden
        className={cn(
          'w-1 shrink-0 rounded-full',
          NOTIFICATION_TONE_RAIL_STYLES[item.tone],
          settled && 'opacity-40',
        )}
      />

      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          settled ? 'bg-gray-50 text-gray-400' : 'bg-gray-100 text-gray-600',
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {!settled && (
            <span
              aria-label="Unread"
              className="h-2 w-2 shrink-0 rounded-full bg-[var(--cares-primary)]"
            />
          )}
          <p
            className={cn(
              'min-w-0 truncate text-[13px]',
              settled ? 'font-medium text-gray-600' : 'font-semibold text-gray-900',
            )}
          >
            {item.title}
          </p>
          <span className="text-[11px] text-gray-400">
            {NOTIFICATION_CATEGORY_LABELS[item.category]}
          </span>
          {item.tone !== 'info' && !settled && (
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                NOTIFICATION_TONE_CHIP_STYLES[item.tone],
              )}
            >
              {NOTIFICATION_TONE_LABELS[item.tone]}
            </span>
          )}
        </div>
        <p
          className={cn(
            'mt-0.5 text-[12px] leading-relaxed',
            settled ? 'text-gray-400' : 'text-gray-600',
          )}
        >
          {item.description}
        </p>
      </div>

      {/* Actions stay out of the way until the row is hovered or focused. */}
      <div className="flex shrink-0 items-start gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        {item.href && (
          <Link
            to={item.href}
            aria-label={`Open ${item.title}`}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
        {!settled && (
          <button
            type="button"
            onClick={() => onMarkRead(item.id)}
            aria-label={`Mark "${item.title}" as read`}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          aria-label={`Dismiss "${item.title}"`}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </li>
  )
}
