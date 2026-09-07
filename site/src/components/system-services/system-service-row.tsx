import { AlertTriangle, Loader2, Play, ScrollText, Settings2, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatRelativeTime } from '../../constants/formatting'
import {
  SERVICE_OWNER_LABELS,
  describeTrigger,
  formatCountdown,
} from '../../constants/system-services'
import type { SystemService } from '../../types/system-service'
import { ServiceRunHistory } from './ui/service-run-history'
import { ServiceRuntimeBar } from './ui/service-runtime-bar'
import { ServiceStateBadge } from './ui/service-state-badge'

interface SystemServiceRowProps {
  service: SystemService
  /** Shared clock tick — the countdown and the elapsed bar read from it, not Date.now. */
  now: number
  /** True while one of this row's controls is in flight. */
  busy: boolean
  onTogglePaused: (service: SystemService) => void
  onRunNow: (service: SystemService) => void
  onStopRun: (service: SystemService) => void
  onConfigure: (service: SystemService) => void
  onViewLogs: (service: SystemService) => void
}

export function SystemServiceRow({
  service,
  now,
  busy,
  onTogglePaused,
  onRunNow,
  onStopRun,
  onConfigure,
  onViewLogs,
}: SystemServiceRowProps) {
  const paused = service.state === 'paused'
  const running = service.state === 'running'
  const capSeconds = service.duration.maxRuntimeMinutes * 60

  const spentSeconds = running && service.currentRunStartedAt
    ? (now - new Date(service.currentRunStartedAt).getTime()) / 1000
    : (service.recentRuns.at(-1)?.durationSeconds ?? service.averageRuntimeSeconds)

  return (
    <li className="px-4 py-3.5 transition-colors hover:bg-gray-50/70">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 lg:w-[30%]">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-semibold text-gray-900">
              {service.name}
            </p>
            <ServiceStateBadge state={service.state} />
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12px] text-gray-500">
            {service.description}
          </p>
          <p className="mt-1 text-[11px] text-gray-400">
            {SERVICE_OWNER_LABELS[service.owner] ?? service.owner} ·{' '}
            {paused ? 'off duty' : `${service.onDutyDays} d on duty`}
          </p>
        </div>

        <div className="min-w-0 lg:w-[22%]">
          <p className="text-[11px] tracking-wider text-gray-500 uppercase lg:hidden">
            Trigger
          </p>
          <p className="truncate text-[13px] font-medium text-gray-800">
            {describeTrigger(service.trigger)}
          </p>
          <p className="text-[11px] text-gray-400 tabular-nums">
            {paused
              ? 'no next run while paused'
              : running
                ? 'in progress'
                : `next ${formatCountdown(service.nextRunAt, now)}`}
            {service.lastRunAt && ` · last ${formatRelativeTime(service.lastRunAt)}`}
          </p>
        </div>

        <div className="min-w-0 lg:w-[20%]">
          <p className="mb-1 text-[11px] tracking-wider text-gray-500 uppercase lg:hidden">
            Runtime
          </p>
          <ServiceRuntimeBar
            spentSeconds={spentSeconds}
            averageSeconds={service.averageRuntimeSeconds}
            capSeconds={capSeconds}
            running={running}
          />
        </div>

        <div className="hidden min-w-0 lg:block lg:w-[13%]">
          <ServiceRunHistory runs={service.recentRuns} capSeconds={capSeconds} />
        </div>

        <div className="flex items-center justify-end gap-1.5 lg:w-[15%]">
          {running ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStopRun(service)}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Square data-icon="inline-start" />
              )}
              Stop
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRunNow(service)}
              disabled={busy || paused}
            >
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Play data-icon="inline-start" />
              )}
              Run now
            </Button>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onViewLogs(service)}
                aria-label={`Logs for ${service.name}`}
              >
                <ScrollText />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">View logs</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onConfigure(service)}
                aria-label={`Schedule for ${service.name}`}
              >
                <Settings2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Trigger and duration</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="pl-1">
                <Switch
                  checked={!paused}
                  disabled={busy}
                  onCheckedChange={() => onTogglePaused(service)}
                  aria-label={paused ? `Resume ${service.name}` : `Pause ${service.name}`}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {paused ? 'Put back on duty' : 'Pause — it stops firing until resumed'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {service.lastError && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[12px] text-red-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0">{service.lastError}</span>
        </p>
      )}
    </li>
  )
}
