import { ServerOff } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useClockTick } from '../../hooks/use-clock-tick'
import type { SystemService } from '../../types/system-service'
import { SystemServiceRow } from './system-service-row'

interface SystemServicesListProps {
  services: SystemService[]
  busyId: string | null
  onTogglePaused: (service: SystemService) => void
  onRunNow: (service: SystemService) => void
  onStopRun: (service: SystemService) => void
  onConfigure: (service: SystemService) => void
  onViewLogs: (service: SystemService) => void
}

/** Column headings, shown once above the rows so each row need not repeat them. */
const COLUMNS = [
  { key: 'service', label: 'Service', width: 'lg:w-[30%]' },
  { key: 'trigger', label: 'Trigger', width: 'lg:w-[22%]' },
  { key: 'runtime', label: 'Runtime', width: 'lg:w-[20%]' },
  { key: 'history', label: 'Last runs', width: 'lg:w-[13%]' },
  { key: 'controls', label: 'Controls', width: 'lg:w-[15%]' },
] as const

export function SystemServicesList({
  services,
  busyId,
  onTogglePaused,
  onRunNow,
  onStopRun,
  onConfigure,
  onViewLogs,
}: SystemServicesListProps) {
  // One timer for the whole board: countdowns to the next trigger and the elapsed
  // bar on a run in flight both advance from this re-render.
  const now = useClockTick(1000, services.some((one) => one.state !== 'paused'))

  if (services.length === 0) {
    return (
      <Card className="items-center py-10 text-center shadow-sm">
        <ServerOff className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-3 text-[13px] text-gray-500">
          No scheduler is in that state right now.
        </p>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className="gap-0 py-0 shadow-sm">
        <div className="hidden items-center px-4 pt-3 pb-2 lg:flex">
          {COLUMNS.map((column) => (
            <p
              key={column.key}
              className={`${column.width} text-[11px] tracking-wider text-gray-500 uppercase ${
                column.key === 'controls' ? 'text-right' : ''
              }`}
            >
              {column.label}
            </p>
          ))}
        </div>

        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {services.map((service) => (
            <SystemServiceRow
              key={service.id}
              service={service}
              now={now}
              busy={busyId === service.id}
              onTogglePaused={onTogglePaused}
              onRunNow={onRunNow}
              onStopRun={onStopRun}
              onConfigure={onConfigure}
              onViewLogs={onViewLogs}
            />
          ))}
        </ul>
      </Card>
    </TooltipProvider>
  )
}
