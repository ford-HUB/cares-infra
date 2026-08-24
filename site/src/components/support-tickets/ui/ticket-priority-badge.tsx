import { TICKET_PRIORITY_LABELS } from '../../../constants/support-tickets'
import type { SupportTicketPriority } from '../../../types/support-ticket'

const priorityStyles: Record<SupportTicketPriority, string> = {
  high: 'bg-red-50 text-red-700 ring-red-200',
  medium: 'bg-amber-50 text-amber-800 ring-amber-200',
  low: 'bg-teal-50 text-teal-700 ring-teal-200',
}

export function TicketPriorityBadge({ priority }: { priority: SupportTicketPriority }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${priorityStyles[priority] ?? priorityStyles.low}`}
    >
      {TICKET_PRIORITY_LABELS[priority]}
    </span>
  )
}
