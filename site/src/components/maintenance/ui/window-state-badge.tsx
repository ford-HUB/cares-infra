import { cn } from '@/lib/utils'
import {
  WINDOW_STATE_DOT_STYLES,
  WINDOW_STATE_LABELS,
  WINDOW_STATE_STYLES,
} from '../../../constants/maintenance'
import type { WindowState } from '../../../types/maintenance'
import { LivePulse } from '../../attendance/ui/live-pulse'

interface WindowStateBadgeProps {
  state: WindowState
  className?: string
}

/** Where a booked window sits in its life; only a window running now animates. */
export function WindowStateBadge({ state, className }: WindowStateBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        WINDOW_STATE_STYLES[state],
        className,
      )}
    >
      <LivePulse
        colorClass={WINDOW_STATE_DOT_STYLES[state]}
        animate={state === 'active'}
      />
      {WINDOW_STATE_LABELS[state]}
    </span>
  )
}
