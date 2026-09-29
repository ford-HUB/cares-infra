import { useEffect, useMemo, useState } from 'react'
import { AttendanceSessionBanner } from '../../components/attendance/attendance-session-banner'
import { AttendanceTable } from '../../components/attendance/attendance-table'
import { AttendanceToolbar } from '../../components/attendance/attendance-toolbar'
import { AttendanceSessionBannerSkeleton } from '../../components/attendance/ui/attendance-session-banner-skeleton'
import { LiveAttendeeDetailModal } from '../../components/attendance/ui/live-attendee-detail-modal'
import { NoActiveSession } from '../../components/attendance/ui/no-active-session'
import { ContentShell } from '../../components/portal/ui/content-shell'
import {
  LIVE_POLL_INTERVAL_MS,
  LIVE_STATE_FILTER_ALL,
  type LiveStateFilter,
} from '../../constants/attendance'
import { useAttendanceStore } from '../../store/attendance-store'
import type { LiveAttendanceCounts, LiveAttendee } from '../../types/attendance'

/**
 * The director's live view of today's running event: who the geofence is currently
 * capturing on site, and who has pushed nothing yet. The settled roster and its
 * completed/absent ruling belong to the Attendees page — this one is only the
 * in-flight picture, so it re-polls itself while it is open.
 */
export function AttendanceLogPage() {
  const session = useAttendanceStore((s) => s.session)
  const attendees = useAttendanceStore((s) => s.attendees)
  const capturedAt = useAttendanceStore((s) => s.capturedAt)
  const loading = useAttendanceStore((s) => s.loading)
  const refreshing = useAttendanceStore((s) => s.refreshing)
  const initialized = useAttendanceStore((s) => s.initialized)
  const error = useAttendanceStore((s) => s.error)
  const fetchLiveAttendance = useAttendanceStore((s) => s.fetchLiveAttendance)

  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState<LiveStateFilter>(LIVE_STATE_FILTER_ALL)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<LiveAttendee | null>(null)

  useEffect(() => {
    void fetchLiveAttendance()
  }, [fetchLiveAttendance])

  // Silent polls keep the rows on screen — the sweep bar is the only sign of activity.
  useEffect(() => {
    const timer = window.setInterval(
      () => void fetchLiveAttendance({ silent: true }),
      LIVE_POLL_INTERVAL_MS,
    )
    return () => window.clearInterval(timer)
  }, [fetchLiveAttendance])

  const counts = useMemo<LiveAttendanceCounts>(
    () => ({
      roster: attendees.length,
      inArea: attendees.filter((one) => one.state === 'in_area').length,
      outsideArea: attendees.filter((one) => one.state === 'outside_area').length,
      awaitingSync: attendees.filter((one) => one.state === 'awaiting_sync').length,
    }),
    [attendees],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return attendees.filter((attendee) => {
      const matchesSearch =
        term.length === 0 ||
        `${attendee.firstName} ${attendee.lastName}`.toLowerCase().includes(term) ||
        attendee.email.toLowerCase().includes(term) ||
        (attendee.department?.toLowerCase().includes(term) ?? false)

      const matchesState =
        stateFilter === LIVE_STATE_FILTER_ALL || attendee.state === stateFilter

      return matchesSearch && matchesState
    })
  }, [attendees, search, stateFilter])

  const resetToFirstPage =
    <T,>(apply: (value: T) => void) =>
    (value: T) => {
      apply(value)
      setPage(1)
    }

  const showBannerSkeleton = !initialized || (loading && !session)

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      {showBannerSkeleton ? (
        <AttendanceSessionBannerSkeleton />
      ) : (
        session &&
        capturedAt && (
          <AttendanceSessionBanner
            counts={counts}
            state={stateFilter}
            onStateChange={resetToFirstPage(setStateFilter)}
          />
        )
      )}

      {error && (
        <p className="mb-3 shrink-0 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}

      {!showBannerSkeleton && !session ? (
        <NoActiveSession />
      ) : (
        <>
          <AttendanceToolbar
            search={search}
            state={stateFilter}
            shown={filtered.length}
            total={attendees.length}
            initialized={initialized}
            refreshing={refreshing}
            onSearchChange={resetToFirstPage(setSearch)}
            onStateChange={resetToFirstPage(setStateFilter)}
            onRefresh={() => void fetchLiveAttendance({ silent: true })}
          />

          <AttendanceTable
            attendees={filtered}
            loading={loading}
            refreshing={refreshing}
            initialized={initialized}
            capturedAt={capturedAt}
            page={page}
            onPageChange={setPage}
            onView={setSelected}
          />
        </>
      )}

      <LiveAttendeeDetailModal attendee={selected} onClose={() => setSelected(null)} />
    </ContentShell>
  )
}
