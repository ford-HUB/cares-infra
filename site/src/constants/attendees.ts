import type { AttendanceStatus, GeoValidationMethod } from '../types/attendee'

/** Fixed row metrics — the grid measures its container against these to fill the viewport. */
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

/** Light-only palette, in step with the rest of the portal's badges. */
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

/** The METHOD column: where the coordinates came from, not how a scan was taken. */
export const GEO_VALIDATION_METHOD_LABELS: Record<GeoValidationMethod, string> = {
  geofence: 'Geofence',
  offline_sync: 'Offline Sync',
  awaiting_sync: 'Awaiting Sync',
  manual: 'Manual',
}

export const ATTENDEE_COLUMNS = [
  { key: 'name', label: 'Volunteer', width: 'w-[22%]' },
  { key: 'email', label: 'Email', width: 'w-[20%]' },
  { key: 'department', label: 'Department', width: 'w-[14%]' },
  { key: 'event', label: 'Event', width: 'w-[16%]' },
  { key: 'checkedInAt', label: 'First Ping', width: 'w-[13%]' },
  { key: 'method', label: 'Method', width: 'w-[9%]' },
  { key: 'status', label: 'Status', width: 'w-[12%]' },
] as const

/**
 * Cell classes shared by the attendees table and its loading skeleton. They live here
 * so the skeleton cannot drift from the real row — a height mismatch is exactly the
 * layout jump the skeleton exists to prevent.
 */
export const ATTENDEE_CELL_BORDER = 'border-r border-gray-100 last:border-r-0'
export const ATTENDEE_CELL_BASE =
  'h-11 truncate border-b border-gray-100 px-3 py-0 text-[13px]'
export const ATTENDEE_GUTTER_CELL =
  'sticky left-0 z-10 w-10 border-r border-gray-200 bg-gray-50 text-center text-[11px] tabular-nums text-gray-400'
