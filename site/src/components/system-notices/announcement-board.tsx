import dayjs from 'dayjs'
import { AlertTriangle, Info, Megaphone, OctagonAlert, Pin } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatRelativeTime, formatTimestamp } from '../../constants/formatting'
import {
  ANNOUNCEMENT_TONE_LABELS,
  ANNOUNCEMENT_TONE_RAIL_STYLES,
  ANNOUNCEMENT_TONE_STYLES,
} from '../../constants/maintenance'
import type { Announcement, AnnouncementTone } from '../../types/maintenance'

interface AnnouncementBoardProps {
  /** Live notices addressed to this reader — already filtered by the page. */
  announcements: Announcement[]
}

const TONE_ICONS: Record<AnnouncementTone, LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  critical: OctagonAlert,
}

/**
 * The reading side of notices for a coordinator: what the director has announced to
 * them, and nothing about drafts, schedules, or reach. Pinned notices hold the top —
 * this is a feed people act on, not the record the director keeps.
 */
export function AnnouncementBoard({ announcements }: AnnouncementBoardProps) {
  if (announcements.length === 0) {
    return (
      <Card className="py-12 text-center shadow-sm">
        <Megaphone className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-3 text-[13px] font-medium text-gray-700">No announcements yet</p>
        <p className="mt-1 text-[12px] text-gray-500">
          Notices the director addresses to coordinators will show here.
        </p>
      </Card>
    )
  }

  const ordered = [...announcements].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return dayjs(b.publishAt).valueOf() - dayjs(a.publishAt).valueOf()
  })

  const pinned = ordered.filter((one) => one.pinned)
  const rest = ordered.filter((one) => !one.pinned)

  return (
    <div className="space-y-4">
      {pinned.length > 0 && (
        <Section label="Pinned" count={pinned.length}>
          {pinned.map((notice) => (
            <AnnouncementEntry key={notice.id} notice={notice} />
          ))}
        </Section>
      )}
      {rest.length > 0 && (
        <Section label={pinned.length > 0 ? 'Recent' : 'Announcements'} count={rest.length}>
          {rest.map((notice) => (
            <AnnouncementEntry key={notice.id} notice={notice} />
          ))}
        </Section>
      )}
    </div>
  )
}

function Section({
  label,
  count,
  children,
}: {
  label: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <p className="text-[11px] tracking-wider text-gray-500 uppercase">{label}</p>
        <span aria-hidden className="h-px flex-1 bg-gray-200" />
        <p className="text-[11px] text-gray-400 tabular-nums">
          {count} {count === 1 ? 'notice' : 'notices'}
        </p>
      </div>
      <Card className="gap-0 py-0 shadow-sm">
        <ul className="divide-y divide-gray-100">{children}</ul>
      </Card>
    </section>
  )
}

function AnnouncementEntry({ notice }: { notice: Announcement }) {
  const Icon = TONE_ICONS[notice.tone]

  return (
    <li className="flex gap-3 px-4 py-4">
      <span
        aria-hidden
        className={cn('w-1 shrink-0 rounded-full', ANNOUNCEMENT_TONE_RAIL_STYLES[notice.tone])}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
              ANNOUNCEMENT_TONE_STYLES[notice.tone],
            )}
          >
            <Icon className="h-3 w-3" />
            {ANNOUNCEMENT_TONE_LABELS[notice.tone]}
          </span>
          {notice.pinned && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
              <Pin className="h-3 w-3" /> Pinned
            </span>
          )}
          <span
            title={formatTimestamp(notice.publishAt)}
            className="ml-auto shrink-0 text-[11px] text-gray-400"
          >
            {formatRelativeTime(notice.publishAt)}
          </span>
        </div>

        <p className="mt-1.5 text-[14px] font-semibold text-gray-900">{notice.title}</p>
        <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-line text-gray-700">
          {notice.body}
        </p>

        <p className="mt-2 text-[11px] text-gray-400">
          {notice.author}
          {notice.expiresAt && ` · until ${formatTimestamp(notice.expiresAt)}`}
        </p>
      </div>
    </li>
  )
}
