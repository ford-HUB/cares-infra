import { cn } from '@/lib/utils'
import {
  SURFACE_STATE_DOT_STYLES,
  SURFACE_STATE_LABELS,
  SURFACE_STATE_STYLES,
} from '../../../constants/maintenance'
import type { SurfaceState } from '../../../types/maintenance'
import { LivePulse } from '../../attendance/ui/live-pulse'

interface SurfaceStateBadgeProps {
  state: SurfaceState
  className?: string
}

/** Where one surface stands. Only a closed surface animates — it is the live fact. */
export function SurfaceStateBadge({ state, className }: SurfaceStateBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        SURFACE_STATE_STYLES[state],
        className,
      )}
    >
      <LivePulse colorClass={SURFACE_STATE_DOT_STYLES[state]} animate={state === 'down'} />
      {SURFACE_STATE_LABELS[state]}
    </span>
  )
}
