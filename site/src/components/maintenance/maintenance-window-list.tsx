import { CalendarPlus, CalendarOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useClockTick } from '../../hooks/use-clock-tick'
import type { MaintenanceWindow } from '../../types/maintenance'
import { MaintenanceWindowRow } from './maintenance-window-row'

interface MaintenanceWindowListProps {
  windows: MaintenanceWindow[]
  busyId: string | null
  onSchedule: () => void
  onEdit: (window: MaintenanceWindow) => void
  onCancel: (window: MaintenanceWindow) => void
  onToggleRunning: (window: MaintenanceWindow, running: boolean) => void
}

/** Column headings, shown once above the rows so each row need not repeat them. */
const COLUMNS = [
  { key: 'window', label: 'Window', width: 'lg:w-[30%]' },
  { key: 'when', label: 'When', width: 'lg:w-[24%]' },
  { key: 'surfaces', label: 'Surfaces & notice', width: 'lg:w-[22%]' },
  { key: 'controls', label: 'Controls', width: 'lg:w-[24%]' },
] as const

export function MaintenanceWindowList({
  windows,
  busyId,
  onSchedule,
  onEdit,
  onCancel,
  onToggleRunning,
}: MaintenanceWindowListProps) {
  // One timer for the board: every countdown to a start or an end advances from here.
  const now = useClockTick(
    1000,
    windows.some((one) => one.state === 'scheduled' || one.state === 'active'),
  )

  return (
    <Card className="gap-0 py-0 shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-gray-900">Scheduled windows</p>
          <p className="text-[12px] text-gray-500">
            Booked downtime. A window closes the surfaces it names for as long as it runs.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onSchedule}>
          <CalendarPlus data-icon="inline-start" />
          Schedule
        </Button>
      </div>

      {windows.length === 0 ? (
        <div className="border-t border-gray-100 py-10 text-center">
          <CalendarOff className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-[13px] text-gray-500">
            No downtime is booked. Schedule a window so users are told before it happens.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden items-center border-t border-gray-100 px-4 pt-3 pb-2 lg:flex">
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
            {windows.map((window) => (
              <MaintenanceWindowRow
                key={window.id}
                window={window}
                now={now}
                busy={busyId === window.id}
                onEdit={onEdit}
                onCancel={onCancel}
                onToggleRunning={onToggleRunning}
              />
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}
