import { Skeleton } from '@/components/ui/skeleton'
import {
  CALENDAR_GUTTER_WIDTH,
  CALENDAR_HOURS,
  CALENDAR_HOUR_HEIGHT_PX,
  CALENDAR_WEEKDAY_LABELS,
} from '../../../constants/calendar'

const GRID_COLUMNS = `${CALENDAR_GUTTER_WIDTH} repeat(${CALENDAR_WEEKDAY_LABELS.length}, minmax(0, 1fr))`

/**
 * Mirrors the time grid's header row and hour rows so the swap to real data
 * causes no jump — same hour count, same row height, same gutter.
 */
export function CalendarSkeleton() {
  return (
    <div
      aria-hidden
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <div
        className="grid shrink-0 border-b border-gray-200"
        style={{ gridTemplateColumns: GRID_COLUMNS }}
      >
        <div className="border-r border-gray-100" />
        {CALENDAR_WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1.5 border-r border-gray-100 px-2 py-1.5 last:border-r-0"
          >
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-6.5 w-6.5 rounded-full" />
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {CALENDAR_HOURS.map((hour) => (
          <div
            key={hour}
            style={{
              height: `${CALENDAR_HOUR_HEIGHT_PX}px`,
              gridTemplateColumns: GRID_COLUMNS,
            }}
            className="grid border-b border-gray-100"
          >
            <div className="flex justify-end border-r border-gray-100 bg-gray-50/40 px-1.5 pt-1">
              <Skeleton className="h-2.5 w-7" />
            </div>
            {CALENDAR_WEEKDAY_LABELS.map((label) => (
              <div key={label} className="border-r border-gray-100 p-1 last:border-r-0">
                {(hour + label.length) % 4 === 0 && (
                  <Skeleton className="h-full w-full rounded-md" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
