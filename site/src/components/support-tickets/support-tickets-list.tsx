import type { SupportTicket } from '../../types/support-ticket'
import { SupportTicketsListSkeleton } from './ui/support-tickets-list-skeleton'
import { TicketStatusBadge } from './ui/ticket-status-badge'
import { TicketTypeBadge } from './ui/ticket-type-badge'

interface SupportTicketsListProps {
  tickets: SupportTicket[]
  loading: boolean
  /** False until the first fetch settles — see `support-ticket-store`. */
  initialized: boolean
  errored: boolean
  selectedId?: string
  onSelect: (ticket: SupportTicket) => void
}

/** Enough rows to fill the column before the list scrolls. */
const SKELETON_ROWS = 12

/**
 * The left-hand index: ticket number and type only. Everything else about a ticket
 * lives in the detail view it opens, so this column stays narrow and scannable.
 */
export function SupportTicketsList({
  tickets,
  loading,
  initialized,
  errored,
  selectedId,
  onSelect,
}: SupportTicketsListProps) {
  const showSkeleton = !initialized || (loading && tickets.length === 0)

  return (
    <section
      aria-busy={showSkeleton}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <header className="flex shrink-0 items-baseline justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
        <h2 className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
          Tickets
        </h2>
        {!showSkeleton && (
          <span className="text-[11px] text-gray-400">{tickets.length} shown</span>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {showSkeleton && <SupportTicketsListSkeleton rows={SKELETON_ROWS} />}

        {!showSkeleton && tickets.length === 0 && (
          <p className="px-3 py-8 text-center text-[13px] text-gray-500">
            {errored
              ? 'Support tickets could not be loaded.'
              : 'No tickets match the current filters.'}
          </p>
        )}

        {!showSkeleton && tickets.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {tickets.map((ticket) => {
              const isSelected = ticket.id === selectedId

              return (
                <li key={ticket.id}>
                  <button
                    type="button"
                    aria-current={isSelected}
                    onClick={() => onSelect(ticket)}
                    className={`flex w-full flex-col items-start gap-1 px-3 py-1.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-green-50/80 ring-1 ring-[var(--cares-primary)] ring-inset'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="font-mono text-[12px] font-semibold text-gray-900">
                        {ticket.reference}
                      </span>
                      <TicketStatusBadge status={ticket.status} />
                    </span>
                    {/* Type and reporter share a line so a row stays two lines tall. */}
                    <span className="flex w-full min-w-0 items-center gap-1.5">
                      <TicketTypeBadge type={ticket.type} />
                      <span
                        className="truncate text-[11px] text-gray-500"
                        title={ticket.requester.email}
                      >
                        {ticket.requester.name}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
