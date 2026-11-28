import { useCallback, useEffect, useState } from 'react'
import { LoginActivityTable } from '../../components/login-activity/login-activity-table'
import { LoginActivityToolbar } from '../../components/login-activity/login-activity-toolbar'
import { LoginActivityDetailsPanel } from '../../components/login-activity/ui/login-activity-details-panel'
import { ContentShell } from '../../components/portal/ui/content-shell'
import {
  LOGIN_ACTIVITY_DEFAULT_RANGE,
  LOGIN_ACTIVITY_FILTER_ALL,
  LOGIN_ACTIVITY_SEARCH_DEBOUNCE_MS,
  type LoginOutcomeFilter,
  type LoginSourceFilter,
} from '../../constants/login-activity'
import { useLoginActivityStore } from '../../store/login-activity-store'
import type { LoginActivityEntry, LoginActivityRange } from '../../types/login-activity'
import { exportLoginActivityCsv } from '../../utils/export-login-activity-csv'

export function LoginActivityPage() {
  const entries = useLoginActivityStore((state) => state.entries)
  const total = useLoginActivityStore((state) => state.total)
  const nextCursor = useLoginActivityStore((state) => state.nextCursor)
  const loading = useLoginActivityStore((state) => state.loading)
  const loadingMore = useLoginActivityStore((state) => state.loadingMore)
  const initialized = useLoginActivityStore((state) => state.initialized)
  const error = useLoginActivityStore((state) => state.error)
  const fetchActivity = useLoginActivityStore((state) => state.fetchActivity)
  const loadMore = useLoginActivityStore((state) => state.loadMore)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [outcome, setOutcome] = useState<LoginOutcomeFilter>(LOGIN_ACTIVITY_FILTER_ALL)
  const [source, setSource] = useState<LoginSourceFilter>(LOGIN_ACTIVITY_FILTER_ALL)
  const [range, setRange] = useState<LoginActivityRange>(LOGIN_ACTIVITY_DEFAULT_RANGE)
  const [selected, setSelected] = useState<LoginActivityEntry | null>(null)

  /** Filters run server-side; the grid only holds scrolled pages. */
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search.trim()),
      LOGIN_ACTIVITY_SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    void fetchActivity({ search: debouncedSearch, outcome, source, range })
  }, [fetchActivity, debouncedSearch, outcome, source, range])

  // Stable so the scroll observer isn't rebuilt every render.
  const handleLoadMore = useCallback(() => void loadMore(), [loadMore])

  const failedCount = entries.filter((entry) => entry.outcome !== 'success').length
  const successfulCount = entries.length - failedCount

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <LoginActivityToolbar
        search={search}
        outcome={outcome}
        source={source}
        range={range}
        loaded={entries.length}
        total={total}
        failed={failedCount}
        successful={successfulCount}
        initialized={initialized}
        onSearchChange={setSearch}
        onOutcomeChange={setOutcome}
        onSourceChange={setSource}
        onRangeChange={setRange}
        onExport={() => exportLoginActivityCsv(entries)}
      />

      {/* Distinguish a failed fetch from an empty filter result. */}
      {error && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() =>
              void fetchActivity({ search: debouncedSearch, outcome, source, range })
            }
            className="font-medium underline underline-offset-2 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      <LoginActivityTable
        entries={entries}
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

      <LoginActivityDetailsPanel entry={selected} onClose={() => setSelected(null)} />
    </ContentShell>
  )
}
