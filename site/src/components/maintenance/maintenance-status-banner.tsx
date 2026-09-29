import { CalendarPlus, MessageSquareWarning, ShieldCheck, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '../../constants/formatting'
import {
  MAINTENANCE_SURFACES,
  SURFACE_STATE_BAR_STYLES,
  SURFACE_STATE_ORDER,
  formatCountdown,
} from '../../constants/maintenance'
import type {
  MaintenanceMode,
  MaintenanceSurface,
  MaintenanceWindow,
  SurfaceState,
} from '../../types/maintenance'
import { SurfaceToggle } from './ui/surface-toggle'

interface MaintenanceStatusBannerProps {
  mode: MaintenanceMode
  states: Record<MaintenanceSurface, SurfaceState>
  /** The soonest window still to come — the countdown under the hero. */
  nextWindow: MaintenanceWindow | null
  /** Shared clock tick, so the countdown advances without owning a timer. */
  now: number
  busy: boolean
  onToggleSurface: (surface: MaintenanceSurface) => void
  onEditNotice: () => void
  onScheduleWindow: () => void
}

/**
 * The one question this page answers: is CARES up right now, and for whom. The four
 * surfaces are parts of one system, so they share a single availability bar rather
 * than four tiles — and each part is the switch that closes it.
 */
export function MaintenanceStatusBanner({
  mode,
  states,
  nextWindow,
  now,
  busy,
  onToggleSurface,
  onEditNotice,
  onScheduleWindow,
}: MaintenanceStatusBannerProps) {
  const counts = SURFACE_STATE_ORDER.reduce(
    (totals, state) => ({
      ...totals,
      [state]: MAINTENANCE_SURFACES.filter((one) => states[one] === state).length,
    }),
    {} as Record<SurfaceState, number>,
  )

  const total = MAINTENANCE_SURFACES.length
  const open = total - counts.down
  const share = (value: number) => (total > 0 ? value / total : 0)

  return (
    <TooltipProvider>
      <Card size="sm" className="mb-4 shrink-0 shadow-sm">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:w-64 lg:shrink-0">
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                mode.enabled
                  ? 'bg-red-50 text-red-600'
                  : 'bg-emerald-50 text-emerald-600',
              )}
            >
              {mode.enabled ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] tracking-wider text-gray-500 uppercase">
                {mode.enabled ? 'In maintenance' : 'All systems live'}
              </p>
              <p className="flex items-baseline gap-1.5">
                <span className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
                  {open}
                </span>
                <span className="text-[13px] text-gray-400 tabular-nums">
                  of {total} surfaces open
                </span>
              </p>
              <p className="mt-0.5 truncate text-[11px] text-gray-400 tabular-nums">
                {mode.enabled && mode.since
                  ? `Down since ${formatRelativeTime(mode.since)}${
                      mode.estimatedEndAt
                        ? ` · back in ${formatCountdown(mode.estimatedEndAt, now)}`
                        : ''
                    }`
                  : nextWindow
                    ? `Next window in ${formatCountdown(nextWindow.startAt, now)}`
                    : 'No window booked'}
              </p>
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-gray-100">
              {SURFACE_STATE_ORDER.map((state) => (
                <div
                  key={state}
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500',
                    SURFACE_STATE_BAR_STYLES[state],
                  )}
                  style={{ width: `${share(counts[state]) * 100}%` }}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap">
              {MAINTENANCE_SURFACES.map((surface) => (
                <SurfaceToggle
                  key={surface}
                  surface={surface}
                  state={states[surface]}
                  busy={busy}
                  onToggle={onToggleSurface}
                />
              ))}
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

          <div className="flex shrink-0 flex-col gap-1.5 lg:w-44">
            <Button variant="outline" size="sm" onClick={onEditNotice}>
              <MessageSquareWarning data-icon="inline-start" />
              Downtime notice
            </Button>
            <Button size="sm" onClick={onScheduleWindow}>
              <CalendarPlus data-icon="inline-start" />
              Schedule window
            </Button>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
