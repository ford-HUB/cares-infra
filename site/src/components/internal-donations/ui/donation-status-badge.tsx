import { DONATION_STATUS_LABELS } from '../../../constants/internal-donation'
import type { DonationStatus } from '../../../types/internal-donation'

const statusStyles: Record<DonationStatus, { badge: string; dot: string }> = {
  pledged: { badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  awaiting_pickup: { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  verifying: { badge: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  confirmed: { badge: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  declined: { badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
}

/** Dense badge sized for the donations table; reused in the detail dialog header. */
export function DonationStatusBadge({ status }: { status: DonationStatus }) {
  const style = statusStyles[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {DONATION_STATUS_LABELS[status]}
    </span>
  )
}
