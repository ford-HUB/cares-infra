import { Megaphone, Pin } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  formatNumber,
  formatRelativeTime,
  formatTimeOfDay,
} from '../../constants/formatting'
import {
  ANNOUNCEMENT_TONE_LABELS,
  ANNOUNCEMENT_TONE_RAIL_STYLES,
  ANNOUNCEMENT_TONE_STYLES,
  AUDIENCE_LABELS,
  CHANNEL_LABELS,
  audienceReachTotal,
} from '../../constants/maintenance'
import type { Announcement } from '../../types/maintenance'
import { AnnouncementStateBadge } from '../maintenance/ui/announcement-state-badge'

/** One day of the feed — the heading and the notices filed under it. */
export interface NoticeDayGroup {
  key: string
  label: string
  notices: Announcement[]
}

interface NoticeFeedProps {
  groups: NoticeDayGroup[]
  emptyMessage: string
}

/**
 * Every announcement the portal has made, newest first. This is the reading side of
 * the announcement board on Maintenance: no controls, because the question here is
 * "what have we told people, and when", not "what should go out next".
 */
export function NoticeFeed({ groups, emptyMessage }: NoticeFeedProps) {
  if (groups.length === 0) {
    return (
      <Card className="py-10 text-center shadow-sm">
        <Megaphone className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-3 text-[13px] text-gray-500">{emptyMessage}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.key}>
          <div className="mb-2 flex items-center gap-3">
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">
              {group.label}
            </p>
            <span aria-hidden className="h-px flex-1 bg-gray-200" />
            <p className="text-[11px] text-gray-400 tabular-nums">
              {group.notices.length}{' '}
              {group.notices.length === 1 ? 'notice' : 'notices'}
            </p>
          </div>

          <Card className="gap-0 py-0 shadow-sm">
            <ul className="divide-y divide-gray-100">
              {group.notices.map((notice) => (
                <NoticeEntry key={notice.id} notice={notice} />
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  )
}

function NoticeEntry({ notice }: { notice: Announcement }) {
  const settled = notice.state === 'expired'
  const sent = notice.state === 'published' || settled
  const potential = audienceReachTotal(notice.audiences)

  return (
    <li className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50/70">
      {/* The clock reads first: this page is a chronology before it is a list. */}
      <div className="w-16 shrink-0 pt-0.5 text-right">
        <p
          className={cn(
            'text-[12px] font-medium tabular-nums',
            settled ? 'text-gray-400' : 'text-gray-600',
          )}
        >
          {formatTimeOfDay(notice.publishAt)}
        </p>
        <p className="text-[11px] text-gray-400">
          {formatRelativeTime(notice.publishAt)}
        </p>
      </div>

      {/* Tone reads before the title does — it is why the reader stopped on this row. */}
      <span
        aria-hidden
        className={cn(
          'w-1 shrink-0 rounded-full',
          ANNOUNCEMENT_TONE_RAIL_STYLES[notice.tone],
          settled && 'opacity-40',
        )}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {notice.pinned && (
            <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Pinned" />
          )}
          <p
            className={cn(
              'min-w-0 truncate text-[13px] font-semibold',
              settled ? 'text-gray-500' : 'text-gray-900',
            )}
          >
            {notice.title}
          </p>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
              ANNOUNCEMENT_TONE_STYLES[notice.tone],
            )}
          >
            {ANNOUNCEMENT_TONE_LABELS[notice.tone]}
          </span>
          <AnnouncementStateBadge state={notice.state} className="shrink-0" />
        </div>

        <p className="mt-1 text-[13px] text-gray-700">{notice.body}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {notice.audiences.map((audience) => (
            <span
              key={audience}
              className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600"
            >
              {AUDIENCE_LABELS[audience]}
            </span>
          ))}
          <span className="text-[11px] text-gray-400 tabular-nums">
            {sent
              ? `${formatNumber(notice.reach)} of ${formatNumber(potential)} reached`
              : `${formatNumber(potential)} accounts addressed`}
          </span>
        </div>

        <p className="mt-1 truncate text-[11px] text-gray-400">
          {notice.author} · {notice.channels.map((one) => CHANNEL_LABELS[one]).join(' · ')}
        </p>
      </div>
    </li>
  )
}
