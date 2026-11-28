import type { AccessRightsFilter } from '../types/access-control'

export const ACCESS_ROW_HEIGHT_PX = 44
export const ACCESS_HEADER_HEIGHT_PX = 36

/** Table paginates client-side; service fetches up to this ceiling. */
export const ACCESS_USERS_PAGE_SIZE = 100
export const ACCESS_USERS_MAX_LOADED = 2000

export const ACCESS_ROLE_FILTER_ALL = 'all'
export const ACCESS_RIGHTS_FILTER_ALL: AccessRightsFilter = 'all'

export const ACCESS_RIGHTS_FILTERS: {
  value: AccessRightsFilter
  label: string
}[] = [
  { value: 'all', label: 'All Rights' },
  { value: 'customised', label: 'Customised' },
  { value: 'suspended', label: 'Suspended' },
]

export const ACCESS_COLUMNS = [
  { key: 'name', label: 'Full Name', width: 'w-[22%]' },
  { key: 'email', label: 'Email', width: 'w-[22%]' },
  { key: 'role', label: 'Role', width: 'w-[12%]' },
  { key: 'department', label: 'Department', width: 'w-[14%]' },
  { key: 'scope', label: 'Access Scope', width: 'w-[16%]' },
  { key: 'rights', label: 'Rights', width: 'w-[14%]' },
  { key: 'actions', label: '', width: 'w-14' },
] as const

/** Shared with the loading skeleton so row heights can't drift. */
export const ACCESS_CELL_BORDER = 'border-r border-gray-100 last:border-r-0'
export const ACCESS_CELL_BASE =
  'h-11 truncate border-b border-gray-100 px-3 py-0 text-[13px]'
export const ACCESS_GUTTER_CELL =
  'sticky left-0 z-10 w-10 border-r border-gray-200 bg-gray-50 text-center text-[11px] tabular-nums text-gray-400'

/** Admin baseline is fixed server-side. */
export const EDITABLE_BASELINE_ROLES = ['director', 'coordinator']

/** In days; `0` means indefinite. */
export const SUSPENSION_DURATIONS: { value: number; label: string }[] = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 0, label: 'Until lifted' },
]

export const SUSPENSION_REASON_MAX = 500
