import { Loader2, Megaphone, Pencil, Pin, PinOff, Send, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatNumber, formatPercent, formatRelativeTime } from '../../constants/formatting'
import {
  ANNOUNCEMENT_TONE_LABELS,
  ANNOUNCEMENT_TONE_RAIL_STYLES,
  ANNOUNCEMENT_TONE_STYLES,
  AUDIENCE_LABELS,
  CHANNEL_LABELS,
  audienceReachTotal,
} from '../../constants/maintenance'
import type { Announcement } from '../../types/maintenance'
import { AnnouncementStateBadge } from './ui/announcement-state-badge'

interface AnnouncementRowProps {
  announcement: Announcement
  busy: boolean
  onEdit: (announcement: Announcement) => void
  onPublish: (announcement: Announcement) => void
  onTakeDown: (announcement: Announcement) => void
  onTogglePinned: (announcement: Announcement) => void
}

export function AnnouncementRow({
  announcement,
  busy,
  onEdit,
  onPublish,
  onTakeDown,
  onTogglePinned,
}: AnnouncementRowProps) {
  const published = announcement.state === 'published'
  const settled = announcement.state === 'expired'
  const potential = audienceReachTotal(announcement.audiences)

  return (
    <li className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50/70">
      {/* Tone reads before the title does — it is why the reader stopped on this row. */}
      <span
        aria-hidden
        className={cn(
          'w-1 shrink-0 rounded-full',
          ANNOUNCEMENT_TONE_RAIL_STYLES[announcement.tone],
          settled && 'opacity-40',
        )}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 lg:w-[44%]">
          <div className="flex items-center gap-2">
            {announcement.pinned && (
              <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Pinned" />
            )}
            <p
              className={cn(
                'truncate text-[13px] font-semibold',
                settled ? 'text-gray-500' : 'text-gray-900',
              )}
            >
              {announcement.title}
            </p>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                ANNOUNCEMENT_TONE_STYLES[announcement.tone],
              )}
            >
              {ANNOUNCEMENT_TONE_LABELS[announcement.tone]}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12px] text-gray-500">
            {announcement.body}
          </p>
          <p className="mt-1 truncate text-[11px] text-gray-400">
            {announcement.author} ·{' '}
            {announcement.channels.map((one) => CHANNEL_LABELS[one]).join(' · ')}
          </p>
        </div>

        <div className="min-w-0 lg:w-[22%]">
          <p className="text-[11px] tracking-wider text-gray-500 uppercase lg:hidden">
            Audience
          </p>
          <div className="flex flex-wrap gap-1">
            {announcement.audiences.map((audience) => (
              <span
                key={audience}
                className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600"
              >
                {AUDIENCE_LABELS[audience]}
              </span>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-gray-400 tabular-nums">
            {published || settled
              ? `${formatNumber(announcement.reach)} of ${formatNumber(potential)} reached · ${formatPercent(
                  potential > 0 ? announcement.reach / potential : 0,
                )}`
              : `${formatNumber(potential)} accounts addressed`}
          </p>
        </div>

        <div className="min-w-0 lg:w-[16%]">
          <AnnouncementStateBadge state={announcement.state} />
          <p className="mt-1 truncate text-[11px] text-gray-400 tabular-nums">
            {published
              ? `Out ${formatRelativeTime(announcement.publishAt)}`
              : announcement.state === 'scheduled'
                ? `Goes out ${formatRelativeTime(announcement.publishAt)}`
                : announcement.state === 'draft'
                  ? 'Not sent yet'
                  : `Ended ${announcement.expiresAt ? formatRelativeTime(announcement.expiresAt) : ''}`}
          </p>
        </div>

        <div className="flex items-center justify-end gap-1.5 lg:w-[18%]">
          {published ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onTakeDown(announcement)}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Undo2 data-icon="inline-start" />}
              Take down
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={busy || settled}
              onClick={() => onPublish(announcement)}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Send data-icon="inline-start" />}
              Publish
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={announcement.pinned ? 'Unpin announcement' : 'Pin announcement'}
            aria-pressed={announcement.pinned}
            disabled={busy}
            onClick={() => onTogglePinned(announcement)}
          >
            {announcement.pinned ? <PinOff /> : <Pin />}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit announcement"
            disabled={busy}
            onClick={() => onEdit(announcement)}
          >
            <Pencil />
          </Button>
        </div>
      </div>
    </li>
  )
}

/** Empty state for a filter that matches nothing — a designed screen, not a blank list. */
export function AnnouncementEmpty({ message }: { message: string }) {
  return (
    <div className="border-t border-gray-100 py-10 text-center">
      <Megaphone className="mx-auto h-8 w-8 text-gray-300" />
      <p className="mt-3 text-[13px] text-gray-500">{message}</p>
    </div>
  )
}
