import { Activity, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  DIAGNOSTIC_OVERALL_LABELS,
  DIAGNOSTIC_OVERALL_STYLES,
  DIAGNOSTIC_OVERALL_TICK_STYLES,
  formatSweepAgo,
} from '../../constants/system-diagnostics'
import { useClockTick } from '../../hooks/use-clock-tick'
import type { DiagnosticReport, DiagnosticHistoryEntry } from '../../types/system-diagnostics'

interface SystemDiagnosticsBannerProps {
  report: DiagnosticReport | null
  /** Oldest first. */
  history: DiagnosticHistoryEntry[]
  running: boolean
  onRunNow: () => void
}

/**
 * The one question this page answers first: is everything the schedulers depend on
 * answering right now. The verdict, how stale it is, and the strip of past sweeps
 * sit together so "fine now" and "fine for the last hour" are read in one glance.
 */
export function SystemDiagnosticsBanner({
  report,
  history,
  running,
  onRunNow,
}: SystemDiagnosticsBannerProps) {
  const now = useClockTick(1000)
  const failing = report?.checks.filter((one) => one.status === 'fail').length ?? 0
  const warning = report?.checks.filter((one) => one.status === 'warn').length ?? 0

  return (
    <Card size="sm" className="mb-4 shrink-0 shadow-sm">
      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3 lg:w-72 lg:shrink-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--cares-tag-system-bg)] text-[var(--cares-tag-system-text)]">
            <Activity className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">
              Last sweep
            </p>
            {report ? (
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[15px] font-semibold',
                    DIAGNOSTIC_OVERALL_STYLES[report.overall],
                  )}
                >
                  {DIAGNOSTIC_OVERALL_LABELS[report.overall]}
                </span>
                <span className="text-[13px] text-gray-500 tabular-nums">
                  {formatSweepAgo(report.checkedAt, now)}
                  {report.source === 'manual' && ' · manual'}
                </span>
              </p>
            ) : (
              <p className="text-[13px] text-gray-500">
                No sweep yet — the first lands within a minute of boot.
              </p>
            )}
          </div>
        </div>

        <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-baseline gap-4 text-[13px] tabular-nums">
            <span className="text-gray-700">
              <span className="font-semibold text-gray-900">{report?.checks.length ?? 0}</span>{' '}
              checks
            </span>
            <span className={failing > 0 ? 'text-red-700' : 'text-gray-400'}>
              <span className="font-semibold">{failing}</span> failing
            </span>
            <span className={warning > 0 ? 'text-amber-700' : 'text-gray-400'}>
              <span className="font-semibold">{warning}</span> warning
            </span>
            {report && (
              <span className="text-gray-400">
                sweep took {report.durationMs} ms
              </span>
            )}
          </div>

          {history.length > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex h-2 flex-1 items-stretch gap-px overflow-hidden rounded-full bg-gray-100">
                {history.map((entry) => (
                  <Tooltip key={entry.checkedAt}>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          'min-w-0 flex-1',
                          DIAGNOSTIC_OVERALL_TICK_STYLES[entry.overall],
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {DIAGNOSTIC_OVERALL_LABELS[entry.overall]}
                      {entry.failing > 0 && ` · ${entry.failing} failing`} ·{' '}
                      {new Date(entry.checkedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <span className="shrink-0 text-[11px] text-gray-400 tabular-nums">
                last {history.length} sweeps
              </span>
            </div>
          ) : (
            <div className="h-2 rounded-full bg-gray-100" />
          )}
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={running}
          onClick={onRunNow}
          className="gap-1.5 self-start lg:self-center"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', running && 'animate-spin')} />
          {running ? 'Checking…' : 'Check now'}
        </Button>
      </CardContent>
    </Card>
  )
}
