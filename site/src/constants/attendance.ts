import type { LiveAttendanceState } from '../types/attendance'

export const LIVE_ROW_HEIGHT_PX = 44
export const LIVE_HEADER_HEIGHT_PX = 36

export const LIVE_POLL_INTERVAL_MS = 20_000

export const LIVE_STALE_PING_MS = 5 * 60 * 1000

export const LIVE_STATE_FILTER_ALL = 'all'

export type LiveStateFilter = LiveAttendanceState | typeof LIVE_STATE_FILTER_ALL

export const LIVE_STATE_LABELS: Record<LiveAttendanceState, string> = {
  in_area: 'Ongoing',
  outside_area: 'Outside Area',
  awaiting_sync: 'Not Synced',
}

export const LIVE_STATE_STYLES: Record<LiveAttendanceState, string> = {
  in_area: 'bg-emerald-50 text-emerald-700',
  outside_area: 'bg-amber-50 text-amber-700',
  awaiting_sync: 'bg-gray-100 text-gray-600',
}

export const LIVE_STATE_DOT_STYLES: Record<LiveAttendanceState, string> = {
  in_area: 'bg-emerald-500',
  outside_area: 'bg-amber-500',
  awaiting_sync: 'bg-gray-400',
}

export const LIVE_STATE_FILTERS: { value: LiveStateFilter; label: string }[] = [
  { value: LIVE_STATE_FILTER_ALL, label: 'All Volunteers' },
  { value: 'in_area', label: LIVE_STATE_LABELS.in_area },
  { value: 'outside_area', label: LIVE_STATE_LABELS.outside_area },
  { value: 'awaiting_sync', label: LIVE_STATE_LABELS.awaiting_sync },
]

export const LIVE_ATTENDANCE_COLUMNS = [
  { key: 'name', label: 'Volunteer', width: 'w-[24%]' },
  { key: 'department', label: 'Department', width: 'w-[12%]' },
  { key: 'firstPingAt', label: 'First Ping', width: 'w-[11%]' },
  { key: 'lastPingAt', label: 'Last Ping', width: 'w-[13%]' },
  { key: 'distance', label: 'Distance', width: 'w-[11%]' },
  { key: 'coverage', label: 'Coverage', width: 'w-[15%]' },
  { key: 'state', label: 'Live Status', width: 'w-[14%]' },
] as const

/** Shared with the loading skeleton so row heights can't drift. */
export const LIVE_CELL_BORDER = 'border-r border-gray-100 last:border-r-0'
export const LIVE_CELL_BASE = 'h-11 truncate border-b border-gray-100 px-3 py-0 text-[13px]'
export const LIVE_GUTTER_CELL =
  'sticky left-0 z-10 w-10 border-r border-gray-200 bg-gray-50 text-center text-[11px] tabular-nums text-gray-400'

export const LIVE_STATE_ORDER: LiveAttendanceState[] = [
  'in_area',
  'outside_area',
  'awaiting_sync',
]

export const LIVE_STATE_HINTS: Record<LiveAttendanceState, string> = {
  in_area: 'Latest reading places the volunteer inside the event geofence.',
  outside_area: 'Readings are arriving, but the latest one is outside the geofence.',
  awaiting_sync: 'No coordinates pushed yet — device offline, or the app never opened.',
}

export const LIVE_STATE_BAR_STYLES: Record<LiveAttendanceState, string> = {
  in_area: 'bg-emerald-500',
  outside_area: 'bg-amber-400',
  awaiting_sync: 'bg-gray-300',
}
