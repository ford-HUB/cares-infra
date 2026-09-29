import { Download, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AUDIT_CATEGORY_FILTERS,
  AUDIT_OUTCOME_FILTERS,
  AUDIT_RANGE_FILTERS,
  AUDIT_SEVERITY_FILTERS,
  type AuditCategoryFilter,
  type AuditOutcomeFilter,
  type AuditSeverityFilter,
} from '../../constants/audit-logs'
import type { AuditLogRange } from '../../types/audit-log'

interface AuditLogsToolbarProps {
  search: string
  category: AuditCategoryFilter
  severity: AuditSeverityFilter
  outcome: AuditOutcomeFilter
  range: AuditLogRange
  /** Entries scrolled in so far — the grid loads the trail a page at a time. */
  loaded: number
  total: number
  /** Counts describe what is loaded, not the whole trail, so they grow while scrolling. */
  critical: number
  failed: number
  /** False until the first fetch settles, so the counts don't flash "0 of 0 entries". */
  initialized: boolean
  onSearchChange: (value: string) => void
  onCategoryChange: (value: AuditCategoryFilter) => void
  onSeverityChange: (value: AuditSeverityFilter) => void
  onOutcomeChange: (value: AuditOutcomeFilter) => void
  onRangeChange: (value: AuditLogRange) => void
  onExport: () => void
}

const selectClass =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

export function AuditLogsToolbar({
  search,
  category,
  severity,
  outcome,
  range,
  loaded,
  total,
  critical,
  failed,
  initialized,
  onSearchChange,
  onCategoryChange,
  onSeverityChange,
  onOutcomeChange,
  onRangeChange,
  onExport,
}: AuditLogsToolbarProps) {
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Audit Logs</h1>
        {initialized ? (
          <>
            <p className="text-[13px] text-gray-500">
              {loaded} of {total} entries loaded
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-[12px] text-red-700">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              {critical} critical
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[12px] text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {failed} failed or denied
            </span>
          </>
        ) : (
          <>
            <Skeleton aria-hidden className="h-3.5 w-24" />
            <Skeleton aria-hidden className="h-5 w-20 rounded-full" />
            <Skeleton aria-hidden className="h-5 w-28 rounded-full" />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search actor, action, target, IP, or request id"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by category"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value as AuditCategoryFilter)}
          className={selectClass}
        >
          {AUDIT_CATEGORY_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by severity"
          value={severity}
          onChange={(event) => onSeverityChange(event.target.value as AuditSeverityFilter)}
          className={selectClass}
        >
          {AUDIT_SEVERITY_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by outcome"
          value={outcome}
          onChange={(event) => onOutcomeChange(event.target.value as AuditOutcomeFilter)}
          className={selectClass}
        >
          {AUDIT_OUTCOME_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by time range"
          value={range}
          onChange={(event) => onRangeChange(event.target.value as AuditLogRange)}
          className={selectClass}
        >
          {AUDIT_RANGE_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onExport}
          title="Exports the entries loaded so far"
          className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>
    </div>
  )
}
