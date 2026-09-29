import {
  DONATION_KIND_LABELS,
  DONATION_SKELETON_ROWS,
  DONATION_TABLE_COLUMNS,
} from '../../constants/internal-donation'
import { formatCurrency, formatRelativeTime } from '../../constants/formatting'
import type { InternalDonation } from '../../types/internal-donation'
import { DonationStatusBadge } from './ui/donation-status-badge'
import { InternalDonationsTableSkeleton } from './ui/internal-donations-table-skeleton'

interface InternalDonationsTableProps {
  donations: InternalDonation[]
  loading: boolean
  /** False until the first fetch settles — see `internal-donation-store`. */
  initialized: boolean
  errored: boolean
  onSelect: (donation: InternalDonation) => void
}

const cellBase = 'h-14 border-b border-gray-100 px-3 align-middle text-[13px]'

/** One line summarising what was given, so both kinds fit the same column. */
function donationDetail(donation: InternalDonation): string {
  if (donation.kind === 'money') {
    return donation.method ?? 'Payment'
  }

  const items = donation.items ?? []
  const first = items[0]
  if (!first) return 'Goods'
  const rest = items.length - 1
  return `${first.quantity} ${first.unit} ${first.name}${rest > 0 ? ` +${rest} more` : ''}`
}

export function InternalDonationsTable({
  donations,
  loading,
  initialized,
  errored,
  onSelect,
}: InternalDonationsTableProps) {
  const showSkeleton = !initialized || (loading && donations.length === 0)

  return (
    <div aria-busy={showSkeleton} className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead>
          <tr className="bg-gray-50">
            {DONATION_TABLE_COLUMNS.map((column) => (
              <th
                key={column.key}
                className="border-b border-gray-200 px-3 py-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        {showSkeleton ? (
          <InternalDonationsTableSkeleton rows={DONATION_SKELETON_ROWS} />
        ) : (
          <tbody>
            {donations.length === 0 && (
              <tr>
                <td
                  colSpan={DONATION_TABLE_COLUMNS.length}
                  className="px-3 py-10 text-center text-[13px] text-gray-500"
                >
                  {errored
                    ? 'Donations could not be loaded.'
                    : 'No donations match the current filters.'}
                </td>
              </tr>
            )}

            {donations.map((donation) => (
              <tr
                key={donation.id}
                onClick={() => onSelect(donation)}
                className="cursor-pointer transition-colors hover:bg-gray-50"
              >
                <td className={`${cellBase} font-mono font-semibold text-gray-900`}>
                  {donation.reference}
                </td>
                <td className={cellBase}>
                  <span className="block font-medium text-gray-900">
                    {donation.donor.name}
                  </span>
                  <span className="block text-[11px] text-gray-500">
                    {donation.donor.type} · {donation.donor.email}
                  </span>
                </td>
                <td className={cellBase}>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      donation.kind === 'money'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    {DONATION_KIND_LABELS[donation.kind]}
                  </span>
                </td>
                <td className={`${cellBase} max-w-[220px] text-gray-700`}>
                  <span className="block truncate" title={donation.eventTitle}>
                    {donation.eventTitle}
                  </span>
                </td>
                <td className={cellBase}>
                  <span className="block font-medium text-gray-900">
                    {formatCurrency(donation.amount)}
                  </span>
                  <span className="block text-[11px] text-gray-500">
                    {donationDetail(donation)}
                  </span>
                </td>
                <td className={cellBase}>
                  <DonationStatusBadge status={donation.status} />
                </td>
                <td className={`${cellBase} text-gray-500`}>
                  {formatRelativeTime(donation.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  )
}
