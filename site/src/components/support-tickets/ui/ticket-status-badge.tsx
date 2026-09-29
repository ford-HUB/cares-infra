import { TICKET_STATUS_LABELS } from '../../../constants/support-tickets'
import type { SupportTicketStatus } from '../../../types/support-ticket'

const statusStyles: Record<SupportTicketStatus, { badge: string; dot: string }> = {
  open: { badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  in_progress: { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  under_verification: { badge: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  client_feedback: { badge: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  resolved: { badge: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  closed: { badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
}

/** Dense badge sized for the tickets grid; reused in the details panel header. */
export function TicketStatusBadge({ status }: { status: SupportTicketStatus }) {
  const style = statusStyles[status] ?? statusStyles.closed

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {TICKET_STATUS_LABELS[status]}
    </span>
  )
}
