import type {
  AuditLogCategory,
  AuditLogOutcome,
  AuditLogRange,
  AuditLogSeverity,
} from '../types/audit-log'

/** Fixed row metrics — the grid measures its container against these to fill the viewport. */
export const AUDIT_ROW_HEIGHT_PX = 44
export const AUDIT_HEADER_HEIGHT_PX = 36

/** Entries pulled per scroll page — enough to overflow the container so a scroll exists. */
export const AUDIT_PAGE_SIZE = 25

/** Search narrows on the server, so hold the keystrokes before refetching the trail. */
export const AUDIT_SEARCH_DEBOUNCE_MS = 300

export const AUDIT_FILTER_ALL = 'all'

export const AUDIT_DEFAULT_RANGE: AuditLogRange = '7d'

export type AuditCategoryFilter = AuditLogCategory | typeof AUDIT_FILTER_ALL
export type AuditSeverityFilter = AuditLogSeverity | typeof AUDIT_FILTER_ALL
export type AuditOutcomeFilter = AuditLogOutcome | typeof AUDIT_FILTER_ALL

export const AUDIT_CATEGORY_LABELS: Record<AuditLogCategory, string> = {
  authentication: 'Authentication',
  'access-control': 'Access Control',
  'user-management': 'User Management',
  verification: 'Verification',
  event: 'Events',
  certificate: 'Certificates',
  communication: 'Communication',
  system: 'System',
}

export const AUDIT_CATEGORY_FILTERS: { value: AuditCategoryFilter; label: string }[] = [
  { value: AUDIT_FILTER_ALL, label: 'All Categories' },
  ...(Object.entries(AUDIT_CATEGORY_LABELS) as [AuditLogCategory, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
]

export const AUDIT_SEVERITY_FILTERS: { value: AuditSeverityFilter; label: string }[] = [
  { value: AUDIT_FILTER_ALL, label: 'All Severity' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'notice', label: 'Notice' },
  { value: 'info', label: 'Info' },
]

export const AUDIT_OUTCOME_FILTERS: { value: AuditOutcomeFilter; label: string }[] = [
  { value: AUDIT_FILTER_ALL, label: 'All Outcomes' },
  { value: 'success', label: 'Success' },
  { value: 'failure', label: 'Failure' },
  { value: 'denied', label: 'Denied' },
]

export const AUDIT_RANGE_FILTERS: { value: AuditLogRange; label: string }[] = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
]

/** Left rail colour on a row — the fastest read of "does this entry need a look". */
export const AUDIT_SEVERITY_ACCENT: Record<AuditLogSeverity, string> = {
  info: 'bg-transparent',
  notice: 'bg-blue-400',
  warning: 'bg-amber-400',
  critical: 'bg-red-500',
}

export const AUDIT_COLUMNS = [
  { key: 'time', label: 'Timestamp', width: 'w-[15%]' },
  { key: 'actor', label: 'Actor', width: 'w-[20%]' },
  { key: 'action', label: 'Action', width: 'w-[27%]' },
  { key: 'category', label: 'Category', width: 'w-[13%]' },
  { key: 'target', label: 'Target', width: 'w-[15%]' },
  { key: 'ipAddress', label: 'IP Address', width: 'w-[10%]' },
  { key: 'outcome', label: 'Outcome', width: 'w-[10%]' },
] as const

/**
 * Shared cell classes — the grid and its skeleton both read these, so a row and its
 * placeholder cannot drift apart in height or padding.
 */
export const AUDIT_CELL_BORDER = 'border-r border-gray-100 last:border-r-0'
export const AUDIT_CELL_BASE =
  'h-11 truncate border-b border-gray-100 px-3 py-0 text-[13px]'
export const AUDIT_GUTTER_CELL =
  'sticky left-0 z-10 w-10 border-r border-gray-200 bg-gray-50 text-center text-[11px] tabular-nums text-gray-400'
