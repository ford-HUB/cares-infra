import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { AnnouncementBoard } from '../../components/maintenance/announcement-board'
import { MaintenanceStatusBanner } from '../../components/maintenance/maintenance-status-banner'
import { MaintenanceWindowList } from '../../components/maintenance/maintenance-window-list'
import { AnnouncementDialog } from '../../components/maintenance/ui/announcement-dialog'
import { DowntimeNoticeDialog } from '../../components/maintenance/ui/downtime-notice-dialog'
import { MaintenanceSkeleton } from '../../components/maintenance/ui/maintenance-skeleton'
import { MaintenanceWindowDialog } from '../../components/maintenance/ui/maintenance-window-dialog'
import { ContentShell } from '../../components/portal/ui/content-shell'
import {
  ANNOUNCEMENT_STATE_FILTER_ALL,
  ANNOUNCEMENT_STATE_ORDER,
  MAINTENANCE_POLL_INTERVAL_MS,
  blankAnnouncement,
  resolveSurfaceStates,
  type AnnouncementStateFilter,
} from '../../constants/maintenance'
import { useClockTick } from '../../hooks/use-clock-tick'
import { useMaintenanceStore } from '../../store/maintenance-store'
import type {
  Announcement,
  MaintenanceSurface,
  MaintenanceWindow,
} from '../../types/maintenance'

/** Where a window sits in the board's order: what is happening now reads first. */
const WINDOW_ORDER: Record<MaintenanceWindow['state'], number> = {
  active: 0,
  scheduled: 1,
  completed: 2,
  cancelled: 3,
}

/** A blank booking, so the dialog has the same shape for new and existing windows. */
function blankWindow(): MaintenanceWindow {
  return {
    id: '',
    title: '',
    reason: '',
    surfaces: [],
    startAt: dayjs().add(1, 'day').hour(1).minute(0).second(0).toISOString(),
    endAt: dayjs().add(1, 'day').hour(2).minute(30).second(0).toISOString(),
    state: 'scheduled',
    noticeLeadMinutes: 60,
    allowAdmins: true,
    createdBy: 'You',
  }
}

export function MaintenancePage() {
  const mode = useMaintenanceStore((s) => s.mode)
  const windows = useMaintenanceStore((s) => s.windows)
  const announcements = useMaintenanceStore((s) => s.announcements)
  const initialized = useMaintenanceStore((s) => s.initialized)
  const error = useMaintenanceStore((s) => s.error)
  const busyId = useMaintenanceStore((s) => s.busyId)
  const fetchAll = useMaintenanceStore((s) => s.fetchAll)
  const applyMode = useMaintenanceStore((s) => s.applyMode)
  const saveWindow = useMaintenanceStore((s) => s.saveWindow)
  const cancelWindow = useMaintenanceStore((s) => s.cancelWindow)
  const toggleWindowRunning = useMaintenanceStore((s) => s.toggleWindowRunning)
  const saveNotice = useMaintenanceStore((s) => s.saveNotice)
  const setNoticeState = useMaintenanceStore((s) => s.setNoticeState)
  const togglePinned = useMaintenanceStore((s) => s.togglePinned)

  const [filter, setFilter] = useState<AnnouncementStateFilter>(
    ANNOUNCEMENT_STATE_FILTER_ALL,
  )
  const [editingWindow, setEditingWindow] = useState<MaintenanceWindow | null>(null)
  const [editingNotice, setEditingNotice] = useState<Announcement | null>(null)
  const [noticeOpen, setNoticeOpen] = useState(false)

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  // Silent polls keep the board on screen — a window can start on its own while the
  // page is open, and a screen watched all night must not blink back to its skeleton.
  useEffect(() => {
    const timer = window.setInterval(
      () => void fetchAll({ silent: true }),
      MAINTENANCE_POLL_INTERVAL_MS,
    )
    return () => window.clearInterval(timer)
  }, [fetchAll])

  // One timer for the header's countdown; the window board owns its own for the rows.
  const now = useClockTick(1000, initialized)

  const states = useMemo(() => resolveSurfaceStates(mode, windows), [mode, windows])

  const orderedWindows = useMemo(
    () =>
      [...windows].sort((a, b) => {
        if (WINDOW_ORDER[a.state] !== WINDOW_ORDER[b.state]) {
          return WINDOW_ORDER[a.state] - WINDOW_ORDER[b.state]
        }
        // Upcoming windows read soonest-first; settled ones read newest-first.
        const ascending = a.state === 'scheduled' || a.state === 'active'
        const diff = dayjs(a.startAt).valueOf() - dayjs(b.startAt).valueOf()
        return ascending ? diff : -diff
      }),
    [windows],
  )

  const nextWindow = useMemo(
    () => orderedWindows.find((one) => one.state === 'scheduled') ?? null,
    [orderedWindows],
  )

  // Counted over the whole board, not the filtered view — the chips must not move
  // when one of them is selected.
  const counts = useMemo(() => {
    const base = ANNOUNCEMENT_STATE_ORDER.reduce(
      (totals, state) => ({
        ...totals,
        [state]: announcements.filter((one) => one.state === state).length,
      }),
      {} as Record<AnnouncementStateFilter, number>,
    )
    return { ...base, [ANNOUNCEMENT_STATE_FILTER_ALL]: announcements.length }
  }, [announcements])

  const visibleAnnouncements = useMemo(() => {
    const matching =
      filter === ANNOUNCEMENT_STATE_FILTER_ALL
        ? announcements
        : announcements.filter((one) => one.state === filter)

    // Pinned first, because that is where these land in the feeds this board writes to.
    return [...matching].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return dayjs(b.publishAt).valueOf() - dayjs(a.publishAt).valueOf()
    })
  }, [announcements, filter])

  const toggleSurface = (surface: MaintenanceSurface) => {
    const closed = mode?.surfaces ?? []
    void applyMode(
      closed.includes(surface)
        ? closed.filter((one) => one !== surface)
        : [...closed, surface],
    )
  }

  return (
    <ContentShell>
      <header className="mb-4">
        <h1 className="text-[15px] font-semibold text-gray-900">Maintenance</h1>
        <p className="mt-0.5 text-[13px] text-gray-600">
          Close CARES on purpose, book the downtime ahead of time, and tell people
          before it happens. The switch and the announcement live together because a
          window nobody was told about is an outage.
        </p>
      </header>

      {/*
        A failed read would otherwise leave the banner showing the last state, which
        reads as "everything is up" exactly when it may not be.
      */}
      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchAll()}
            className="font-medium underline underline-offset-2 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      ) : initialized && mode ? (
        <div className="space-y-4">
          <MaintenanceStatusBanner
            mode={mode}
            states={states}
            nextWindow={nextWindow}
            now={now}
            busy={busyId === 'mode'}
            onToggleSurface={toggleSurface}
            onEditNotice={() => setNoticeOpen(true)}
            onScheduleWindow={() => setEditingWindow(blankWindow())}
          />

          <MaintenanceWindowList
            windows={orderedWindows}
            busyId={busyId}
            onSchedule={() => setEditingWindow(blankWindow())}
            onEdit={setEditingWindow}
            onCancel={(one) => void cancelWindow(one)}
            onToggleRunning={(one, running) => void toggleWindowRunning(one, running)}
          />

          <AnnouncementBoard
            announcements={visibleAnnouncements}
            counts={counts}
            filter={filter}
            busyId={busyId}
            onFilterChange={setFilter}
            onCompose={() => setEditingNotice(blankAnnouncement())}
            onEdit={setEditingNotice}
            onPublish={(one) => void setNoticeState(one, 'published')}
            onTakeDown={(one) => void setNoticeState(one, 'expired')}
            onTogglePinned={(one) => void togglePinned(one)}
          />
        </div>
      ) : (
        <MaintenanceSkeleton windowRows={4} announcementRows={3} />
      )}

      <DowntimeNoticeDialog
        key={noticeOpen ? 'notice-open' : 'notice-closed'}
        mode={noticeOpen ? mode : null}
        saving={busyId === 'mode'}
        onClose={() => setNoticeOpen(false)}
        onSubmit={(patch) => {
          void applyMode(mode?.surfaces ?? [], patch).then(() => setNoticeOpen(false))
        }}
      />

      <MaintenanceWindowDialog
        key={editingWindow?.id ?? (editingWindow ? 'window-new' : 'window-closed')}
        window={editingWindow}
        saving={busyId === (editingWindow?.id || 'new-window')}
        onClose={() => setEditingWindow(null)}
        onSubmit={(draft) => {
          void saveWindow(editingWindow?.id || null, draft).then(() =>
            setEditingWindow(null),
          )
        }}
      />

      <AnnouncementDialog
        key={editingNotice?.id ?? (editingNotice ? 'announcement-new' : 'announcement-closed')}
        announcement={editingNotice}
        saving={busyId === (editingNotice?.id || 'new-announcement')}
        onClose={() => setEditingNotice(null)}
        onSubmit={(draft) => {
          void saveNotice(editingNotice?.id || null, draft).then(() =>
            setEditingNotice(null),
          )
        }}
      />
    </ContentShell>
  )
}
