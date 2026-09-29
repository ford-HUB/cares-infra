import { Search } from 'lucide-react'
import {
  DONATION_ALL_STATUSES,
  DONATION_STATUS_FILTER_ALL,
  DONATION_STATUS_LABELS,
  type DonationStatusFilter,
} from '../../constants/internal-donation'
import type { InternalDonation } from '../../types/internal-donation'
import { InternalDonationsTable } from './internal-donations-table'

interface InternalDonationsBoardProps {
  donations: InternalDonation[]
  statusFilter: DonationStatusFilter
  search: string
  loading: boolean
  initialized: boolean
  errored: boolean
  onStatusFilterChange: (status: DonationStatusFilter) => void
  onSearchChange: (search: string) => void
  onSelect: (donation: InternalDonation) => void
}

const controlClass =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

/**
 * One ledger for both kinds. Money and goods walk different ladders, so the row says
 * which it is and the status filter offers every rung either can reach — the split
 * that mattered is per-donation, not per-view.
 */
export function InternalDonationsBoard({
  donations,
  statusFilter,
  search,
  loading,
  initialized,
  errored,
  onStatusFilterChange,
  onSearchChange,
  onSelect,
}: InternalDonationsBoardProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search reference, donor, or event"
            aria-label="Search donations"
            className={`${controlClass} w-full pl-8`}
          />
        </div>

        <select
          aria-label="Donation status"
          value={statusFilter}
          onChange={(event) =>
            onStatusFilterChange(event.target.value as DonationStatusFilter)
          }
          className={controlClass}
        >
          <option value={DONATION_STATUS_FILTER_ALL}>All statuses</option>
          {DONATION_ALL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {DONATION_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <InternalDonationsTable
          donations={donations}
          loading={loading}
          initialized={initialized}
          errored={errored}
          onSelect={onSelect}
        />
      </div>
    </section>
  )
}
