import {
  ATTENDEE_STATUS_LABELS,
  ATTENDEE_STATUS_STYLES,
} from '../../../constants/attendees'
import type { AttendanceStatus } from '../../../types/attendee'

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus
}

/**
 * The post-event ruling, shared by the Attendees roster and the live Attendance
 * monitor — hence portal/ui rather than either module's own ui/ folder.
 */
export function AttendanceStatusBadge({ status }: AttendanceStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ATTENDEE_STATUS_STYLES[status]}`}
    >
      {ATTENDEE_STATUS_LABELS[status]}
    </span>
  )
}
