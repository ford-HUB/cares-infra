import { cn } from '@/lib/utils'
import {
  ANNOUNCEMENT_STATE_DOT_STYLES,
  ANNOUNCEMENT_STATE_LABELS,
  ANNOUNCEMENT_STATE_STYLES,
} from '../../../constants/maintenance'
import type { AnnouncementState } from '../../../types/maintenance'
import { LivePulse } from '../../attendance/ui/live-pulse'

interface AnnouncementStateBadgeProps {
  state: AnnouncementState
  className?: string
}

/** Whether a notice is out yet. Nothing here animates — publishing is not live data. */
export function AnnouncementStateBadge({ state, className }: AnnouncementStateBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        ANNOUNCEMENT_STATE_STYLES[state],
        className,
      )}
    >
      <LivePulse colorClass={ANNOUNCEMENT_STATE_DOT_STYLES[state]} animate={false} />
      {ANNOUNCEMENT_STATE_LABELS[state]}
    </span>
  )
}
