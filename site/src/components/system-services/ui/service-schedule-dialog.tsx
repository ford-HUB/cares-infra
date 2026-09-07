import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  SERVICE_INTERVAL_PRESETS,
  SERVICE_OVERLAP_HINTS,
  SERVICE_OVERLAP_LABELS,
  SERVICE_RETRY_PRESETS,
  SERVICE_RUNTIME_PRESETS,
  SERVICE_TRIGGER_MODES,
  describeTrigger,
  formatRuntime,
} from '../../../constants/system-services'
import type { ServiceScheduleUpdate } from '../../../services/system-service-service'
import type {
  ServiceOverlapPolicy,
  ServiceTriggerMode,
  SystemService,
} from '../../../types/system-service'

interface ServiceScheduleDialogProps {
  /** The service being configured; `null` keeps the dialog closed. */
  service: SystemService | null
  saving: boolean
  onClose: () => void
  onSubmit: (update: ServiceScheduleUpdate) => void
}

const MODE_LABELS: Record<ServiceTriggerMode, string> = {
  interval: 'Interval',
  daily: 'Daily',
  cron: 'Cron',
  manual: 'Manual',
}

/** Minutes a mode implies, so the countdown and the overlap check have one unit. */
function minutesFor(mode: ServiceTriggerMode, intervalMinutes: number): number {
  return mode === 'interval' ? intervalMinutes : 1440
}

/**
 * The two controls a 24/7 scheduler actually needs: when it fires, and how long it may
 * run before the scheduler kills it. Both live in one dialog because changing the
 * trigger without checking the runtime cap is how a job starts overlapping itself.
 *
 * The parent keys this by service id, so the draft starts fresh for each service.
 */
export function ServiceScheduleDialog({
  service,
  saving,
  onClose,
  onSubmit,
}: ServiceScheduleDialogProps) {
  const [mode, setMode] = useState<ServiceTriggerMode>(service?.trigger.mode ?? 'interval')
  const [intervalMinutes, setIntervalMinutes] = useState(
    service?.trigger.intervalMinutes ?? 15,
  )
  const [dailyAt, setDailyAt] = useState(service?.trigger.dailyAt ?? '01:30')
  const [cronExpression, setCronExpression] = useState(
    service?.trigger.cronExpression ?? '0 * * * *',
  )
  const [maxRuntimeMinutes, setMaxRuntimeMinutes] = useState(
    service?.duration.maxRuntimeMinutes ?? 5,
  )
  const [retries, setRetries] = useState(service?.duration.retries ?? 1)
  const [overlapPolicy, setOverlapPolicy] = useState<ServiceOverlapPolicy>(
    service?.duration.overlapPolicy ?? 'skip',
  )

  if (!service) return null

  const trigger = {
    mode,
    intervalMinutes: minutesFor(mode, intervalMinutes),
    dailyAt,
    cronExpression,
  }

  // A run that may outlast the gap between triggers will collide with itself; the
  // overlap policy is what decides the collision, so say so before it is saved.
  const overlapping =
    mode === 'interval' && maxRuntimeMinutes >= intervalMinutes

  const invalidCron = mode === 'cron' && cronExpression.trim().split(/\s+/).length !== 5

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule — {service.name}</DialogTitle>
          <DialogDescription>
            Runs around the clock. Average run takes{' '}
            {formatRuntime(service.averageRuntimeSeconds)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-2">
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">Trigger</p>
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={mode}
              onValueChange={(value) => value && setMode(value as ServiceTriggerMode)}
              className="w-full"
            >
              {SERVICE_TRIGGER_MODES.map((one) => (
                <ToggleGroupItem key={one} value={one} className="flex-1">
                  {MODE_LABELS[one]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            {mode === 'interval' && (
              <div className="space-y-1.5">
                <Label htmlFor="service-interval">Fire every</Label>
                <Select
                  value={String(intervalMinutes)}
                  onValueChange={(value) => setIntervalMinutes(Number(value))}
                >
                  <SelectTrigger id="service-interval" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_INTERVAL_PRESETS.map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>
                        {minutes >= 60 ? `${minutes / 60} hours` : `${minutes} minutes`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === 'daily' && (
              <div className="space-y-1.5">
                <Label htmlFor="service-daily-at">Fire at (local time)</Label>
                <Input
                  id="service-daily-at"
                  type="time"
                  value={dailyAt}
                  onChange={(event) => setDailyAt(event.target.value)}
                />
              </div>
            )}

            {mode === 'cron' && (
              <div className="space-y-1.5">
                <Label htmlFor="service-cron">Cron expression</Label>
                <Input
                  id="service-cron"
                  value={cronExpression}
                  onChange={(event) => setCronExpression(event.target.value)}
                  placeholder="0 3 * * 0"
                  className="font-mono"
                  aria-invalid={invalidCron}
                />
                <p className="text-[12px] text-gray-500">
                  Five fields: minute, hour, day of month, month, day of week.
                </p>
              </div>
            )}

            {mode === 'manual' && (
              <p className="text-[12px] text-gray-500">
                The service stays loaded but never fires on its own — staff start each
                run from this page.
              </p>
            )}
          </section>

          <section className="space-y-3 border-t border-gray-100 pt-4">
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">Duration</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="service-runtime">Stop the run after</Label>
                <Select
                  value={String(maxRuntimeMinutes)}
                  onValueChange={(value) => setMaxRuntimeMinutes(Number(value))}
                >
                  <SelectTrigger id="service-runtime" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_RUNTIME_PRESETS.map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>
                        {minutes === 1 ? '1 minute' : `${minutes} minutes`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="service-retries">Retries on failure</Label>
                <Select
                  value={String(retries)}
                  onValueChange={(value) => setRetries(Number(value))}
                >
                  <SelectTrigger id="service-retries" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_RETRY_PRESETS.map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {count === 0 ? 'None' : count === 1 ? '1 retry' : `${count} retries`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>If the previous run is still going</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={0}
                value={overlapPolicy}
                onValueChange={(value) =>
                  value && setOverlapPolicy(value as ServiceOverlapPolicy)
                }
                className="w-full"
              >
                {(['skip', 'queue'] as ServiceOverlapPolicy[]).map((one) => (
                  <ToggleGroupItem key={one} value={one} className="flex-1">
                    {SERVICE_OVERLAP_LABELS[one]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="text-[12px] text-gray-500">
                {SERVICE_OVERLAP_HINTS[overlapPolicy]}
              </p>
            </div>
          </section>

          <p className="rounded-lg bg-gray-50 px-3 py-2 text-[12px] text-gray-600">
            {describeTrigger(trigger)} · killed after {maxRuntimeMinutes} min ·{' '}
            {retries === 0 ? 'no retry' : `${retries} retry`}
            {overlapping && (
              <span className="mt-1 block text-amber-700">
                The runtime cap is as long as the gap between triggers — runs may
                overlap, and the scheduler will {overlapPolicy === 'skip' ? 'skip' : 'queue'}{' '}
                the next one.
              </span>
            )}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                trigger,
                duration: { maxRuntimeMinutes, retries, overlapPolicy },
              })
            }
            disabled={saving || invalidCron}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
