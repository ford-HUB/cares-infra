import type {
  LoginActivityRange,
  LoginOutcome,
  LoginSource,
} from '../types/login-activity'

/** Rows pulled per scroll page — enough to overflow the container so a scroll exists. */
export const LOGIN_ACTIVITY_PAGE_SIZE = 25

/** Search narrows on the server, so hold the keystrokes before refetching the trail. */
export const LOGIN_ACTIVITY_SEARCH_DEBOUNCE_MS = 300

export const LOGIN_ACTIVITY_FILTER_ALL = 'all'

export const LOGIN_ACTIVITY_DEFAULT_RANGE: LoginActivityRange = '7d'

export type LoginOutcomeFilter = LoginOutcome | typeof LOGIN_ACTIVITY_FILTER_ALL
export type LoginSourceFilter = LoginSource | typeof LOGIN_ACTIVITY_FILTER_ALL

export const LOGIN_OUTCOME_LABELS: Record<LoginOutcome, string> = {
  success: 'Success',
  'invalid-credentials': 'Invalid credentials',
  'blocked-ip': 'Blocked IP',
  'restricted-account': 'Restricted account',
  'role-not-allowed': 'Role not allowed',
  'locked-out': 'Locked out',
  'outside-login-hours': 'Outside allowed hours',
  'ip-not-allowed': 'IP not allowed',
  'credential-expired': 'Credentials expired',
}

export const LOGIN_SOURCE_LABELS: Record<LoginSource, string> = {
  portal: 'Portal',
  mobile: 'Mobile app',
}

export const LOGIN_OUTCOME_FILTERS: { value: LoginOutcomeFilter; label: string }[] = [
  { value: LOGIN_ACTIVITY_FILTER_ALL, label: 'All Outcomes' },
  ...(Object.entries(LOGIN_OUTCOME_LABELS) as [LoginOutcome, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
]

export const LOGIN_SOURCE_FILTERS: { value: LoginSourceFilter; label: string }[] = [
  { value: LOGIN_ACTIVITY_FILTER_ALL, label: 'All Sources' },
  ...(Object.entries(LOGIN_SOURCE_LABELS) as [LoginSource, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
]

export const LOGIN_RANGE_FILTERS: { value: LoginActivityRange; label: string }[] = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
]

/** Left rail colour on a row — the fastest read of "did this attempt get in". */
export const LOGIN_OUTCOME_ACCENT: Record<LoginOutcome, string> = {
  success: 'bg-transparent',
  'invalid-credentials': 'bg-red-400',
  'blocked-ip': 'bg-red-500',
  'restricted-account': 'bg-amber-400',
  'role-not-allowed': 'bg-amber-400',
  'locked-out': 'bg-red-500',
  'outside-login-hours': 'bg-amber-400',
  'ip-not-allowed': 'bg-red-500',
  'credential-expired': 'bg-amber-400',
}

export const LOGIN_ACTIVITY_COLUMNS = [
  { key: 'time', label: 'Timestamp', width: 'w-[15%]' },
  { key: 'account', label: 'Account', width: 'w-[24%]' },
  { key: 'role', label: 'Role', width: 'w-[11%]' },
  { key: 'ipAddress', label: 'IP Address', width: 'w-[14%]' },
  { key: 'source', label: 'Source', width: 'w-[10%]' },
  { key: 'device', label: 'Device', width: 'w-[14%]' },
  { key: 'outcome', label: 'Outcome', width: 'w-[12%]' },
] as const

/**
 * Cell classes shared by the login-activity table and its loading skeleton. They live
 * here so the skeleton cannot drift from the real row — a height mismatch is exactly
 * the layout jump the skeleton exists to prevent.
 */
export const LOGIN_CELL_BORDER = 'border-r border-gray-100 last:border-r-0'
export const LOGIN_CELL_BASE =
  'h-11 truncate border-b border-gray-100 px-3 py-0 text-[13px]'
export const LOGIN_GUTTER_CELL =
  'sticky left-0 z-10 w-10 border-r border-gray-200 bg-gray-50 text-center text-[11px] tabular-nums text-gray-400'
