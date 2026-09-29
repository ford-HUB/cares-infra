import { Bug, LifeBuoy, Lightbulb, Ticket } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TICKET_PRIORITY_CAPTIONS,
  TICKET_PRIORITY_FILTER_ALL,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_ORDER,
  type TicketPriorityFilter,
} from '../../../constants/support-tickets'
import type {
  SupportTicketBucketCount,
  SupportTicketPriority,
} from '../../../types/support-ticket'

interface TicketPriorityBoardProps {
  buckets: SupportTicketBucketCount[]
  total: number
  /** The active bucket — its row renders as selected. */
  active: TicketPriorityFilter
  /** False until the first fetch settles, so the board doesn't flash zeroes. */
  initialized: boolean
  /** Selecting a row filters the list; selecting it again clears the filter. */
  onSelect: (value: TicketPriorityFilter) => void
}

const bucketStyles: Record<
  SupportTicketPriority,
  { icon: LucideIcon; accent: string; value: string }
> = {
  high: { icon: Bug, accent: 'bg-red-50 text-red-600', value: 'text-red-700' },
  medium: {
    icon: LifeBuoy,
    accent: 'bg-amber-50 text-amber-600',
    value: 'text-amber-700',
  },
  low: { icon: Lightbulb, accent: 'bg-teal-50 text-teal-600', value: 'text-teal-700' },
}

const rowBase =
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors'

/**
 * The board above the ticket list — one row per bucket, Issue / Support / Feature,
 * doubling as the priority filter for the list beside it.
 */
export function TicketPriorityBoard({
  buckets,
  total,
  active,
  initialized,
  onSelect,
}: TicketPriorityBoardProps) {
  return (
    <section className="shrink-0 rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm">
      <div className="mb-1.5 flex items-baseline justify-between px-1">
        <h2 className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
          Ticket Board
        </h2>
        {initialized ? (
          <span className="text-[11px] text-gray-400">{total} total</span>
        ) : (
          <Skeleton aria-hidden className="h-2.5 w-12" />
        )}
      </div>

      {!initialized ? (
        <div className="space-y-0.5">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={`board-skeleton-${index}`} className={rowBase} aria-hidden>
              <Skeleton className="h-7 w-7 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-2.5 w-28" />
              </div>
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-0.5">
          <button
            type="button"
            aria-pressed={active === TICKET_PRIORITY_FILTER_ALL}
            onClick={() => onSelect(TICKET_PRIORITY_FILTER_ALL)}
            className={`${rowBase} ${
              active === TICKET_PRIORITY_FILTER_ALL
                ? 'bg-gray-100'
                : 'hover:bg-gray-50'
            }`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <Ticket className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-gray-900">
                All Tickets
              </span>
              <span className="block truncate text-[11px] text-gray-400">
                Every bucket, any status
              </span>
            </span>
            <span className="text-[13px] font-semibold text-gray-900">{total}</span>
          </button>

          {TICKET_PRIORITY_ORDER.map((priority) => {
            const bucket = buckets.find((item) => item.priority === priority)
            const style = bucketStyles[priority]
            const Icon = style.icon
            const isActive = active === priority

            return (
              <button
                key={priority}
                type="button"
                aria-pressed={isActive}
                onClick={() => onSelect(isActive ? TICKET_PRIORITY_FILTER_ALL : priority)}
                className={`${rowBase} ${isActive ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.accent}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-gray-900">
                    {TICKET_PRIORITY_LABELS[priority]}
                  </span>
                  <span className="block truncate text-[11px] text-gray-400">
                    {TICKET_PRIORITY_CAPTIONS[priority]}
                  </span>
                </span>
                <span className="text-right">
                  <span className={`block text-[13px] font-semibold ${style.value}`}>
                    {bucket?.total ?? 0}
                  </span>
                  <span className="block text-[10px] text-gray-400">
                    {bucket?.unresolved ?? 0} open
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
