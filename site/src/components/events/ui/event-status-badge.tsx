import type { EventStatus } from '../../../types/event'

const STATUS_STYLES: Record<EventStatus, string> = {
  Upcoming: 'bg-purple-100 text-purple-800',
  Ongoing: 'bg-green-100 text-green-800',
  Completed: 'bg-gray-100 text-gray-800',
  Cancelled: 'bg-red-100 text-red-800',
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.Completed}`}
    >
      {status}
    </span>
  )
}

export function getEventStatusColor(status: EventStatus) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.Completed
}
