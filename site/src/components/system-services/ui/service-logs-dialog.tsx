import { useMemo, useState } from 'react'
import { RotateCw, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { formatTimeOfDay } from '../../../constants/formatting'
import {
  SERVICE_LOG_LEVEL_FILTER_ALL,
  SERVICE_LOG_LEVEL_LABELS,
  SERVICE_LOG_LEVEL_ORDER,
  SERVICE_LOG_LEVEL_ROW_STYLES,
  SERVICE_LOG_LEVEL_STYLES,
  SERVICE_RUN_LABELS,
  SERVICE_RUN_STYLES,
  describeTrigger,
  formatRuntime,
  type ServiceLogLevelFilter,
} from '../../../constants/system-services'
import type {
  ServiceLogEntry,
  ServiceLogLevel,
  SystemService,
} from '../../../types/system-service'

interface ServiceLogsDialogProps {
  /** The service whose log is open; `null` keeps the dialog closed. */
  service: SystemService | null
  entries: ServiceLogEntry[]
  loading: boolean
  onRefresh: () => void
  onClose: () => void
}

/**
 * What the scheduler actually wrote, grouped by run and newest run first — the answer
 * to "why is this one red" without leaving the board. Errors and cap kills are tinted
 * so a staff member scrolling a healthy log still lands on the one line that matters.
 */
export function ServiceLogsDialog({
  service,
  entries,
  loading,
  onRefresh,
  onClose,
}: ServiceLogsDialogProps) {
  // The parent keys this by service id, so the level filter starts clear each time a
  // log is opened — reading a log is a fresh question every time.
  const [level, setLevel] = useState<ServiceLogLevelFilter>(SERVICE_LOG_LEVEL_FILTER_ALL)

  const runs = useMemo(() => {
    if (!service) return []

    const byRun = new Map<string, ServiceLogEntry[]>()
    for (const entry of entries) {
      const lines = byRun.get(entry.runId)
      if (lines) lines.push(entry)
      else byRun.set(entry.runId, [entry])
    }

    return service.recentRuns
      .map((run) => ({ run, lines: byRun.get(run.id) ?? [] }))
      .filter((group) => group.lines.length > 0)
      .reverse()
  }, [entries, service])

  if (!service) return null

  const counts = SERVICE_LOG_LEVEL_ORDER.reduce<Record<ServiceLogLevel, number>>(
    (all, one) => ({
      ...all,
      [one]: entries.filter((entry) => entry.level === one).length,
    }),
    { info: 0, warn: 0, error: 0 },
  )

  const visible = (lines: ServiceLogEntry[]) =>
    level === SERVICE_LOG_LEVEL_FILTER_ALL
      ? lines
      : lines.filter((entry) => entry.level === level)

  const matched = runs.reduce((total, group) => total + visible(group.lines).length, 0)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Logs — {service.name}</DialogTitle>
          <DialogDescription>
            Last {runs.length} runs · {describeTrigger(service.trigger)} · cap{' '}
            {service.duration.maxRuntimeMinutes} min
          </DialogDescription>
        </DialogHeader>

        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={level}
          onValueChange={(value) => value && setLevel(value as ServiceLogLevelFilter)}
          className="w-full"
        >
          <ToggleGroupItem value={SERVICE_LOG_LEVEL_FILTER_ALL} className="flex-1">
            All {entries.length}
          </ToggleGroupItem>
          {SERVICE_LOG_LEVEL_ORDER.map((one) => (
            <ToggleGroupItem
              key={one}
              value={one}
              disabled={counts[one] === 0}
              className="flex-1"
            >
              {SERVICE_LOG_LEVEL_LABELS[one]} {counts[one]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="max-h-[46vh] overflow-y-auto rounded-lg border border-gray-100">
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={`log-skeleton-${index}`} className="h-3.5 w-full" />
              ))}
            </div>
          ) : matched === 0 ? (
            <div className="py-10 text-center">
              <ScrollText className="mx-auto h-7 w-7 text-gray-300" />
              <p className="mt-2 text-[13px] text-gray-500">
                No lines at this level in the recent runs.
              </p>
            </div>
          ) : (
            runs.map(({ run, lines }) => {
              const shown = visible(lines)
              if (shown.length === 0) return null

              return (
                <section key={run.id}>
                  <header className="sticky top-0 flex items-center gap-2 border-b border-gray-100 bg-gray-50/95 px-3 py-1.5 backdrop-blur">
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        SERVICE_RUN_STYLES[run.outcome],
                      )}
                    />
                    <p className="text-[12px] font-medium text-gray-700">
                      {SERVICE_RUN_LABELS[run.outcome]}
                    </p>
                    <p className="text-[11px] text-gray-400 tabular-nums">
                      {formatTimeOfDay(run.startedAt)} ·{' '}
                      {formatRuntime(run.durationSeconds)}
                    </p>
                  </header>

                  <ul className="divide-y divide-gray-50">
                    {shown.map((entry) => (
                      <li
                        key={entry.id}
                        className={cn(
                          'flex gap-3 px-3 py-1.5',
                          SERVICE_LOG_LEVEL_ROW_STYLES[entry.level],
                        )}
                      >
                        <span className="shrink-0 font-mono text-[11px] text-gray-400 tabular-nums">
                          {formatTimeOfDay(entry.at)}
                        </span>
                        <span
                          className={cn(
                            'w-12 shrink-0 font-mono text-[11px] uppercase',
                            SERVICE_LOG_LEVEL_STYLES[entry.level],
                          )}
                        >
                          {entry.level}
                        </span>
                        <span className="min-w-0 font-mono text-[12px] break-words text-gray-700">
                          {entry.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            <RotateCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
