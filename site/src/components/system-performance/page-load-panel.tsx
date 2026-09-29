import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatNumber } from '../../constants/formatting'
import {
  PAGE_INTERACTIVE_BUDGET_MS,
  PAGE_PHASE_COLOR,
  PAGE_PHASE_HINTS,
  PAGE_PHASE_LABELS,
  PAGE_PHASE_ORDER,
  formatDuration,
  pagePhaseDurations,
} from '../../constants/system-performance'
import type { PageLoadTiming } from '../../types/system-performance'

interface PageLoadPanelProps {
  pages: PageLoadTiming[]
}

/**
 * Loading time as the browser measures it, per screen. Each bar is one page split into
 * the three phases, so a slow screen says *why* it is slow — waiting on the API reads
 * differently from a heavy bundle, and they have different fixes.
 */
export function PageLoadPanel({ pages }: PageLoadPanelProps) {
  const slowest = Math.max(...pages.map((page) => page.interactiveMs), 1)

  return (
    <TooltipProvider>
      <Card className="gap-0 shadow-sm">
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-gray-900">
                Screen loading time
              </p>
              <p className="mt-0.5 text-[13px] text-gray-600">
                Median time to interactive in staff browsers, split into the phases
                behind it.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {PAGE_PHASE_ORDER.map((phase) => (
                <Tooltip key={phase}>
                  <TooltipTrigger asChild>
                    <span className="flex cursor-help items-center gap-1.5 text-[12px] text-gray-600">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: PAGE_PHASE_COLOR[phase] }}
                      />
                      {PAGE_PHASE_LABELS[phase]}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{PAGE_PHASE_HINTS[phase]}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          <ul className="space-y-3">
            {pages.map((page) => {
              const phases = pagePhaseDurations(page)
              const overBudget = page.interactiveMs > PAGE_INTERACTIVE_BUDGET_MS

              return (
                <li key={page.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[13px] text-gray-700">
                      {page.label}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-[13px] font-semibold tabular-nums',
                        overBudget ? 'text-amber-700' : 'text-gray-900',
                      )}
                    >
                      {formatDuration(page.interactiveMs)}
                    </span>
                  </div>

                  {/* One bar per screen, scaled against the slowest — the phases are
                      parts of that screen's wait, so they share it. */}
                  <div
                    className="flex h-2 gap-0.5"
                    style={{ width: `${(page.interactiveMs / slowest) * 100}%` }}
                  >
                    {PAGE_PHASE_ORDER.map((phase) => (
                      <Tooltip key={phase}>
                        <TooltipTrigger asChild>
                          <span
                            className="h-full rounded-full"
                            style={{
                              width: `${(phases[phase] / page.interactiveMs) * 100}%`,
                              backgroundColor: PAGE_PHASE_COLOR[phase],
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {PAGE_PHASE_LABELS[phase]} — {formatDuration(phases[phase])}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>

                  <p className="text-[11px] text-gray-400 tabular-nums">
                    {formatNumber(page.samples)} page views
                  </p>
                </li>
              )
            })}
          </ul>

          <p className="border-t border-gray-100 pt-3 text-[11px] text-gray-400">
            Amber past {formatDuration(PAGE_INTERACTIVE_BUDGET_MS)} — the point a screen
            stops feeling instant.
          </p>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
