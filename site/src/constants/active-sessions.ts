import type { SessionRole, SessionSource } from '../types/active-session'

/** One keyset page — the grid loads the list a page at a time as it is scrolled. */
export const ACTIVE_SESSIONS_PAGE_SIZE = 25

/** Search narrows on the server, so keystrokes are held back to one request. */
export const ACTIVE_SESSIONS_SEARCH_DEBOUNCE_MS = 300

/** Matches the server's touch window, so "active now" means the same on both sides. */
export const SESSION_ACTIVE_NOW_MS = 15 * 60 * 1000

export const ACTIVE_SESSIONS_FILTER_ALL = 'all'

export type SessionSourceFilter =
  | SessionSource
  | typeof ACTIVE_SESSIONS_FILTER_ALL
export type SessionRoleFilter = SessionRole | typeof ACTIVE_SESSIONS_FILTER_ALL

export const SESSION_SOURCE_LABELS: Record<SessionSource, string> = {
  portal: 'Portal',
  mobile: 'Mobile app',
}

export const SESSION_ROLE_LABELS: Record<SessionRole, string> = {
  admin: 'Admin',
  director: 'Director',
  coordinator: 'Coordinator',
  volunteer: 'Volunteer',
  donor: 'Donor',
  beneficiary: 'Beneficiary',
}

export const SESSION_SOURCE_FILTERS: {
  value: SessionSourceFilter
  label: string
}[] = [
  { value: ACTIVE_SESSIONS_FILTER_ALL, label: 'All Sources' },
  ...(Object.entries(SESSION_SOURCE_LABELS) as [SessionSource, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
]

export const SESSION_ROLE_FILTERS: { value: SessionRoleFilter; label: string }[] = [
  { value: ACTIVE_SESSIONS_FILTER_ALL, label: 'All Roles' },
  ...(Object.entries(SESSION_ROLE_LABELS) as [SessionRole, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
]

export const ACTIVE_SESSIONS_COLUMNS = [
  { key: 'account', label: 'Account', width: 'w-[22%]' },
  { key: 'role', label: 'Role', width: 'w-[11%]' },
  { key: 'device', label: 'Device', width: 'w-[14%]' },
  { key: 'ipAddress', label: 'IP Address', width: 'w-[12%]' },
  { key: 'signedInAt', label: 'Signed In', width: 'w-[14%]' },
  { key: 'lastSeenAt', label: 'Last Active', width: 'w-[11%]' },
  { key: 'expiresAt', label: 'Expires', width: 'w-[10%]' },
  { key: 'actions', label: '', width: 'w-[6%]' },
] as const

/**
 * Cell classes shared by the sessions table and its loading skeleton. They live here
 * so the skeleton cannot drift from the real row — a height mismatch is exactly the
 * layout jump the skeleton exists to prevent.
 */
export const SESSION_CELL_BORDER = 'border-r border-gray-100 last:border-r-0'
export const SESSION_CELL_BASE =
  'h-11 truncate border-b border-gray-100 px-3 py-0 text-[13px]'
export const SESSION_GUTTER_CELL =
  'sticky left-0 z-10 w-10 border-r border-gray-200 bg-gray-50 text-center text-[11px] tabular-nums text-gray-400'
