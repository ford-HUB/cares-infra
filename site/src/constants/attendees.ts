import type {
  AttendanceStatus,
  EventAttendee,
  GeoValidationMethod,
} from '../types/attendee'

export const ATTENDEE_ROW_HEIGHT_PX = 44
export const ATTENDEE_HEADER_HEIGHT_PX = 36

export const ATTENDEE_EVENT_FILTER_ALL = 'all'
export const ATTENDEE_STATUS_FILTER_ALL = 'all'

export type AttendeeStatusFilter = AttendanceStatus | typeof ATTENDEE_STATUS_FILTER_ALL

export const ATTENDEE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  absent: 'Absent',
}

export const ATTENDEE_STATUS_STYLES: Record<AttendanceStatus, string> = {
  pending: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  absent: 'bg-red-50 text-red-700',
}

export const ATTENDEE_STATUS_FILTERS: { value: AttendeeStatusFilter; label: string }[] = [
  { value: ATTENDEE_STATUS_FILTER_ALL, label: 'All Status' },
  { value: 'pending', label: ATTENDEE_STATUS_LABELS.pending },
  { value: 'completed', label: ATTENDEE_STATUS_LABELS.completed },
  { value: 'absent', label: ATTENDEE_STATUS_LABELS.absent },
]

export const GEO_VALIDATION_METHOD_LABELS: Record<GeoValidationMethod, string> = {
  geofence: 'Geofence',
  offline_sync: 'Offline Sync',
  awaiting_sync: 'Awaiting Sync',
  manual: 'Manual',
}

export const ATTENDEE_COLUMNS = [
  { key: 'name', label: 'Volunteer', width: 'w-[20%]' },
  { key: 'email', label: 'Email', width: 'w-[18%]' },
  { key: 'department', label: 'Department', width: 'w-[13%]' },
  { key: 'event', label: 'Event', width: 'w-[16%]' },
  { key: 'timeInOut', label: 'Time In – Time Out', width: 'w-[18%]' },
  { key: 'method', label: 'Method', width: 'w-[9%]' },
  { key: 'status', label: 'Status', width: 'w-[12%]' },
] as const

/** Shared with the loading skeleton so row heights can't drift. */
export const ATTENDEE_CELL_BORDER = 'border-r border-gray-100 last:border-r-0'
export const ATTENDEE_CELL_BASE =
  'h-11 truncate border-b border-gray-100 px-3 py-0 text-[13px]'
export const ATTENDEE_SELECT_CELL = 'w-10 border-r border-gray-100 px-0 text-center'
export const ATTENDEE_GUTTER_CELL =
  'sticky left-0 z-10 w-10 border-r border-gray-200 bg-gray-50 text-center text-[11px] tabular-nums text-gray-400'

export const MANUAL_ATTENDANCE_REASON_MAX = 300

/** Event must be over (the ruling credits its whole window) and the row not completed. */
export function isManuallyMarkable(attendee: EventAttendee, now = Date.now()): boolean {
  return (
    attendee.status !== 'completed' && new Date(attendee.eventEndDate).getTime() <= now
  )
}

/** Rounded to two decimals, matching what the server credits. */
export function scheduledEventHours(attendee: EventAttendee): number {
  const ms =
    new Date(attendee.eventEndDate).getTime() - new Date(attendee.eventDate).getTime()
  return Math.max(0, Math.round((ms / 3_600_000) * 100) / 100)
}
