import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { NoticeFeed, type NoticeDayGroup } from '../../components/system-notices/notice-feed'
import { SystemNoticeBanner } from '../../components/system-notices/system-notice-banner'
import { SystemNoticesSkeleton } from '../../components/system-notices/ui/system-notices-skeleton'
import {
  ANNOUNCEMENT_STATE_FILTER_ALL,
  ANNOUNCEMENT_STATE_LABELS,
  ANNOUNCEMENT_STATE_ORDER,
  MAINTENANCE_POLL_INTERVAL_MS,
  formatNoticeDay,
  type AnnouncementStateFilter,
} from '../../constants/maintenance'
import { ADMIN_MAINTENANCE_PATH } from '../../constants/routes'
import { useMaintenanceStore } from '../../store/maintenance-store'

/**
 * The record of what CARES has told its users, newest first. Announcements are written
 * on Maintenance, where they sit beside the downtime that prompted them; this screen is
 * where staff read them back — so it is a chronology, not a control board.
 */
export function SystemNoticesPage() {
  const announcements = useMaintenanceStore((s) => s.announcements)
  const initialized = useMaintenanceStore((s) => s.initialized)
  const error = useMaintenanceStore((s) => s.error)
  const fetchAll = useMaintenanceStore((s) => s.fetchAll)

  const [filter, setFilter] = useState<AnnouncementStateFilter>(
    ANNOUNCEMENT_STATE_FILTER_ALL,
  )

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  // A scheduled notice can publish itself while this page is open; silent polls keep
  // the feed on screen instead of blinking back to its skeleton.
  useEffect(() => {
    const timer = window.setInterval(
      () => void fetchAll({ silent: true }),
      MAINTENANCE_POLL_INTERVAL_MS,
    )
    return () => window.clearInterval(timer)
  }, [fetchAll])

  // Counted over every notice, not the filtered view — the legend must not move when
  // one of its entries is selected.
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

  const lastPublishedAt = useMemo(() => {
    const published = announcements
      .filter((one) => one.state === 'published')
      .sort((a, b) => dayjs(b.publishAt).valueOf() - dayjs(a.publishAt).valueOf())
    return published[0]?.publishAt ?? null
  }, [announcements])

  const groups = useMemo(() => {
    const matching =
      filter === ANNOUNCEMENT_STATE_FILTER_ALL
        ? announcements
        : announcements.filter((one) => one.state === filter)

    // Strictly newest to oldest. Pinning is honoured in the feeds users read, not here —
    // a chronology that reorders itself cannot be read as a record.
    const ordered = [...matching].sort(
      (a, b) => dayjs(b.publishAt).valueOf() - dayjs(a.publishAt).valueOf(),
    )

    return ordered.reduce<NoticeDayGroup[]>((days, notice) => {
      const key = dayjs(notice.publishAt).format('YYYY-MM-DD')
      const current = days.at(-1)

      if (current?.key === key) {
        current.notices.push(notice)
        return days
      }

      return [
        ...days,
        { key, label: formatNoticeDay(notice.publishAt), notices: [notice] },
      ]
    }, [])
  }, [announcements, filter])

  return (
    <ContentShell>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-gray-900">System Notices</h1>
          <p className="mt-0.5 text-[13px] text-gray-600">
            Every portal-wide announcement, newest first — what was said, who it reached,
            and when it went out.
          </p>
        </div>

        <Button size="sm" asChild>
          <Link to={ADMIN_MAINTENANCE_PATH}>
            <Megaphone data-icon="inline-start" />
            Write a notice
          </Link>
        </Button>
      </header>

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
      ) : initialized ? (
        <div className="space-y-4">
          <SystemNoticeBanner
            counts={counts}
            lastPublishedAt={lastPublishedAt}
            filter={filter}
            onFilterChange={setFilter}
          />

          <NoticeFeed
            groups={groups}
            emptyMessage={
              filter === ANNOUNCEMENT_STATE_FILTER_ALL
                ? 'Nothing has been announced yet. Notices written on Maintenance land here.'
                : `No notice is ${ANNOUNCEMENT_STATE_LABELS[filter].toLowerCase()} right now.`
            }
          />
        </div>
      ) : (
        <SystemNoticesSkeleton groups={2} rowsPerGroup={2} />
      )}
    </ContentShell>
  )
}
