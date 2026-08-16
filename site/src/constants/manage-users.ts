import type { ManagedUser } from '../types/manage-users'

/** Fixed row metrics — the grid measures its container against these to fill the viewport. */
export const USER_ROW_HEIGHT_PX = 44
export const USER_HEADER_HEIGHT_PX = 36

/** The table paginates client-side, so the service pulls pages up to this ceiling. */
export const MANAGE_USERS_PAGE_SIZE = 100
export const MANAGE_USERS_MAX_LOADED = 2000

export const USER_ROLE_FILTER_ALL = 'all'
export const USER_STATUS_FILTER_ALL = 'all'

export type UserStatusFilter = ManagedUser['status'] | typeof USER_STATUS_FILTER_ALL

export const USER_STATUS_FILTERS: { value: UserStatusFilter; label: string }[] = [
  { value: USER_STATUS_FILTER_ALL, label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'restricted', label: 'Restricted' },
]

export const USER_COLUMNS = [
  { key: 'name', label: 'Full Name', width: 'w-[24%]' },
  { key: 'email', label: 'Email', width: 'w-[24%]' },
  { key: 'role', label: 'Role', width: 'w-[14%]' },
  { key: 'department', label: 'Department', width: 'w-[16%]' },
  { key: 'lastLoginIp', label: 'Last IP', width: 'w-[14%]' },
  { key: 'status', label: 'Status', width: 'w-[12%]' },
  { key: 'actions', label: '', width: 'w-14' },
] as const

/**
 * Cell classes shared by the users table and its loading skeleton. They live here so
 * the skeleton cannot drift from the real row — a height mismatch is exactly the
 * layout jump the skeleton exists to prevent.
 */
export const USER_CELL_BORDER = 'border-r border-gray-100 last:border-r-0'
export const USER_CELL_BASE =
  'h-11 truncate border-b border-gray-100 px-3 py-0 text-[13px]'
export const USER_GUTTER_CELL =
  'sticky left-0 z-10 w-10 border-r border-gray-200 bg-gray-50 text-center text-[11px] tabular-nums text-gray-400'

/** Roles that carry a portal signature — the panel only shows that section for these. */
export const PORTAL_ROLE_VALUES = ['admin', 'director', 'coordinator']
