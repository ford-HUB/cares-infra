import dayjs, { type Dayjs } from 'dayjs'
import { useMemo } from 'react'
import {
  CALENDAR_DATE_FORMATS,
  CALENDAR_WEEKDAY_LABELS,
  MONTH_CELL_VISIBLE_EVENTS,
} from '../../../constants/calendar'
import type { CalendarEvent } from '../../../types/calendar'
import { eventsOnDay, monthGridDays } from '../../../utils/calendar-layout'
import { CalendarEventChip } from './calendar-event-chip'

interface CalendarMonthGridProps {
  /** Any day inside the month being drawn. */
  cursor: Dayjs
  events: CalendarEvent[]
  onSelect: (event: CalendarEvent) => void
  /** Drills into the day view — the cell itself is the affordance. */
  onOpenDay: (day: Dayjs) => void
}

export function CalendarMonthGrid({
  cursor,
  events,
  onSelect,
  onOpenDay,
}: CalendarMonthGridProps) {
  const today = dayjs()
  const cells = useMemo(
    () =>
      monthGridDays(cursor).map((day) => ({
        day,
        events: eventsOnDay(events, day),
      })),
    [cursor, events],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="grid shrink-0 grid-cols-7 border-b border-gray-200">
        {CALENDAR_WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-r border-gray-100 px-2 py-2 text-center text-[11px] tracking-wider text-gray-400 uppercase last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-y-auto">
        {cells.map(({ day, events: dayEvents }) => {
          const isCurrentMonth = day.isSame(cursor, 'month')
          const isToday = day.isSame(today, 'day')
          const overflow = dayEvents.length - MONTH_CELL_VISIBLE_EVENTS

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onOpenDay(day)}
              aria-label={`Open ${day.format(CALENDAR_DATE_FORMATS.dayTitle)}`}
              className={`flex min-h-24 flex-col gap-1 border-r border-b border-gray-100 p-1.5 text-left transition-colors last:border-r-0 hover:bg-gray-50 ${
                isCurrentMonth ? 'bg-white' : 'bg-gray-50/60'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold ${
                  isToday
                    ? 'bg-[var(--cares-primary)] text-white'
                    : isCurrentMonth
                      ? 'text-gray-800'
                      : 'text-gray-400'
                }`}
              >
                {day.format(CALENDAR_DATE_FORMATS.dayNumber)}
              </span>

              <span className="min-w-0 flex-1 space-y-0.5">
                {dayEvents.slice(0, MONTH_CELL_VISIBLE_EVENTS).map((event) => (
                  <CalendarEventChip key={event.id} event={event} onSelect={onSelect} />
                ))}
                {overflow > 0 && (
                  <span className="block px-1.5 text-[11px] font-medium text-gray-500">
                    +{overflow} more
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
