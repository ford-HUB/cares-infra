import { Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TICKET_STATUS_FILTERS,
  TICKET_TYPE_FILTERS,
  type TicketStatusFilter,
  type TicketTypeFilter,
} from '../../constants/support-tickets'
import type { SupportTicketSummary } from '../../types/support-ticket'

interface SupportTicketsToolbarProps {
  search: string
  status: TicketStatusFilter
  type: TicketTypeFilter
  shown: number
  summary: SupportTicketSummary
  /** False until the first fetch settles, so the counts don't flash "0 of 0 tickets". */
  initialized: boolean
  onSearchChange: (value: string) => void
  onStatusChange: (value: TicketStatusFilter) => void
  onTypeChange: (value: TicketTypeFilter) => void
}

const selectClass =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

export function SupportTicketsToolbar({
  search,
  status,
  type,
  shown,
  summary,
  initialized,
  onSearchChange,
  onStatusChange,
  onTypeChange,
}: SupportTicketsToolbarProps) {
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Support Tickets</h1>
        {initialized ? (
          <>
            <p className="text-[13px] text-gray-500">
              {shown} of {summary.total} tickets
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[12px] text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              {summary.open} open
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[12px] text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {summary.inProgress} in progress
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-[12px] text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {summary.resolved} resolved
            </span>
          </>
        ) : (
          <>
            <Skeleton aria-hidden className="h-3.5 w-24" />
            <Skeleton aria-hidden className="h-5 w-20 rounded-full" />
            <Skeleton aria-hidden className="h-5 w-24 rounded-full" />
            <Skeleton aria-hidden className="h-5 w-20 rounded-full" />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search ticket #, subject, or requester"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as TicketStatusFilter)}
          className={selectClass}
        >
          {TICKET_STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by type"
          value={type}
          onChange={(event) => onTypeChange(event.target.value as TicketTypeFilter)}
          className={selectClass}
        >
          {TICKET_TYPE_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
