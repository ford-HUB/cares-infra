import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  SURFACE_HINTS,
  SURFACE_LABELS,
  SURFACE_STATE_BAR_STYLES,
  SURFACE_STATE_LABELS,
} from '../../../constants/maintenance'
import type { MaintenanceSurface, SurfaceState } from '../../../types/maintenance'
import { LivePulse } from '../../attendance/ui/live-pulse'

interface SurfaceToggleProps {
  surface: MaintenanceSurface
  state: SurfaceState
  /** True while the switch for this surface is in flight. */
  busy: boolean
  onToggle: (surface: MaintenanceSurface) => void
}

/**
 * One surface of CARES, as a legend entry under the availability bar — and the switch
 * that closes it. The count above the bar is only worth reading if it can be acted on,
 * so the legend is the control rather than a second row of buttons.
 */
export function SurfaceToggle({ surface, state, busy, onToggle }: SurfaceToggleProps) {
  const down = state === 'down'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={down}
          disabled={busy}
          onClick={() => onToggle(surface)}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
            'focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
            'disabled:opacity-60',
            down ? 'bg-gray-100' : 'hover:bg-gray-50',
          )}
        >
          <span
            className={cn(
              'h-7 w-1 shrink-0 rounded-full',
              SURFACE_STATE_BAR_STYLES[state],
              !down && 'opacity-70',
            )}
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-[11px] tracking-wider text-gray-500 uppercase">
              <span className="truncate">{SURFACE_LABELS[surface]}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <LivePulse
                colorClass={SURFACE_STATE_BAR_STYLES[state]}
                animate={down}
              />
              <span
                className={cn(
                  'truncate text-[13px] font-semibold',
                  down ? 'text-red-700' : 'text-gray-900',
                )}
              >
                {SURFACE_STATE_LABELS[state]}
              </span>
            </span>
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64">
        {SURFACE_HINTS[surface]} {down ? 'Click to reopen it.' : 'Click to close it now.'}
      </TooltipContent>
    </Tooltip>
  )
}
