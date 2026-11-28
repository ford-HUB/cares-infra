import { useCallback, useEffect, useState } from 'react'
import { AuditLogsTable } from '../../components/audit-logs/audit-logs-table'
import { AuditLogsToolbar } from '../../components/audit-logs/audit-logs-toolbar'
import { AuditLogDetailsPanel } from '../../components/audit-logs/ui/audit-log-details-panel'
import { ContentShell } from '../../components/portal/ui/content-shell'
import {
  AUDIT_DEFAULT_RANGE,
  AUDIT_FILTER_ALL,
  AUDIT_SEARCH_DEBOUNCE_MS,
  type AuditCategoryFilter,
  type AuditOutcomeFilter,
  type AuditSeverityFilter,
} from '../../constants/audit-logs'
import { useAuditLogStore } from '../../store/audit-log-store'
import type { AuditLogEntry, AuditLogRange } from '../../types/audit-log'
import { exportAuditLogsCsv } from '../../utils/export-audit-logs-csv'

export function AuditLogsPage() {
  const logs = useAuditLogStore((state) => state.logs)
  const total = useAuditLogStore((state) => state.total)
  const nextCursor = useAuditLogStore((state) => state.nextCursor)
  const loading = useAuditLogStore((state) => state.loading)
  const loadingMore = useAuditLogStore((state) => state.loadingMore)
  const initialized = useAuditLogStore((state) => state.initialized)
  const error = useAuditLogStore((state) => state.error)
  const fetchLogs = useAuditLogStore((state) => state.fetchLogs)
  const loadMore = useAuditLogStore((state) => state.loadMore)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<AuditCategoryFilter>(AUDIT_FILTER_ALL)
  const [severity, setSeverity] = useState<AuditSeverityFilter>(AUDIT_FILTER_ALL)
  const [outcome, setOutcome] = useState<AuditOutcomeFilter>(AUDIT_FILTER_ALL)
  const [range, setRange] = useState<AuditLogRange>(AUDIT_DEFAULT_RANGE)
  const [selected, setSelected] = useState<AuditLogEntry | null>(null)

  /** Filters run server-side; the grid only holds scrolled pages. */
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search.trim()),
      AUDIT_SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    void fetchLogs({ search: debouncedSearch, category, severity, outcome, range })
  }, [fetchLogs, debouncedSearch, category, severity, outcome, range])

  // Stable so the scroll observer isn't rebuilt every render.
  const handleLoadMore = useCallback(() => void loadMore(), [loadMore])

  const criticalCount = logs.filter((entry) => entry.severity === 'critical').length
  const failedCount = logs.filter((entry) => entry.outcome !== 'success').length

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <AuditLogsToolbar
        search={search}
        category={category}
        severity={severity}
        outcome={outcome}
        range={range}
        loaded={logs.length}
        total={total}
        critical={criticalCount}
        failed={failedCount}
        initialized={initialized}
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        onSeverityChange={setSeverity}
        onOutcomeChange={setOutcome}
        onRangeChange={setRange}
        onExport={() => exportAuditLogsCsv(logs)}
      />

      {/* Distinguish a failed fetch from an empty filter result. */}
      {error && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() =>
              void fetchLogs({ search: debouncedSearch, category, severity, outcome, range })
            }
            className="font-medium underline underline-offset-2 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      <AuditLogsTable
        logs={logs}
        loading={loading}
        loadingMore={loadingMore}
        initialized={initialized}
        errored={Boolean(error)}
        hasMore={Boolean(nextCursor)}
        total={total}
        selectedId={selected?.id}
        onSelect={setSelected}
        onLoadMore={handleLoadMore}
      />

      <AuditLogDetailsPanel entry={selected} onClose={() => setSelected(null)} />
    </ContentShell>
  )
}
