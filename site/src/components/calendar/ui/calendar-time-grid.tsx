import dayjs, { type Dayjs } from 'dayjs'
import { useMemo } from 'react'
import {
  CALENDAR_DATE_FORMATS,
  CALENDAR_GRID_HEIGHT_PX,
  CALENDAR_GUTTER_WIDTH,
  CALENDAR_HOURS,
  CALENDAR_HOUR_HEIGHT_PX,
} from '../../../constants/calendar'
import type { CalendarEvent } from '../../../types/calendar'
import {
  eventsOnDay,
  nowIndicatorOffset,
  positionDayEvents,
} from '../../../utils/calendar-layout'
import { CalendarEventBlock } from './calendar-event-block'
import { CalendarEventChip } from './calendar-event-chip'

interface CalendarTimeGridProps {
  /** One column per day — seven for the week view, one for the day view. */
  days: Dayjs[]
  events: CalendarEvent[]
  onSelect: (event: CalendarEvent) => void
}

/**
 * The hour-by-hour grid behind both the week and the day view. The only
 * difference between them is how many day columns are handed in.
 */
export function CalendarTimeGrid({ days, events, onSelect }: CalendarTimeGridProps) {
  const columns = `${CALENDAR_GUTTER_WIDTH} repeat(${days.length}, minmax(0, 1fr))`
  const today = dayjs()
  const nowOffset = nowIndicatorOffset(today)

  const byDay = useMemo(
    () =>
      days.map((day) => {
        const dayEvents = eventsOnDay(events, day)
        return {
          day,
          allDay: dayEvents.filter((event) => event.allDay),
          placed: positionDayEvents(dayEvents),
        }
      }),
    [days, events],
  )

  const hasAllDay = byDay.some((column) => column.allDay.length > 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div
        className="grid shrink-0 border-b border-gray-200 bg-white"
        style={{ gridTemplateColumns: columns }}
      >
        <div className="border-r border-gray-100" />
        {days.map((day) => {
          const isToday = day.isSame(today, 'day')
          return (
            <div
              key={day.toISOString()}
              className="border-r border-gray-100 px-2 py-1.5 text-center last:border-r-0"
            >
              <p className="text-[11px] tracking-wider text-gray-400 uppercase">
                {day.format(CALENDAR_DATE_FORMATS.weekdayShort)}
              </p>
              <p
                className={`mx-auto mt-0.5 flex h-6.5 w-6.5 items-center justify-center rounded-full text-[13px] font-semibold ${
                  isToday
                    ? 'bg-[var(--cares-primary)] text-white'
                    : 'text-gray-800'
                }`}
              >
                {day.format(CALENDAR_DATE_FORMATS.dayNumber)}
              </p>
            </div>
          )
        })}
      </div>

      {hasAllDay && (
        <div
          className="grid shrink-0 border-b border-gray-200 bg-gray-50/60"
          style={{ gridTemplateColumns: columns }}
        >
          <div className="flex items-start justify-end border-r border-gray-100 px-2 py-1.5 text-[10px] tracking-wider text-gray-400 uppercase">
            All day
          </div>
          {byDay.map(({ day, allDay }) => (
            <div
              key={day.toISOString()}
              className="min-h-8 space-y-1 border-r border-gray-100 px-1.5 py-1.5 last:border-r-0"
            >
              {allDay.map((event) => (
                <CalendarEventChip key={event.id} event={event} onSelect={onSelect} />
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: columns }}>
          <div className="border-r border-gray-100 bg-gray-50/40">
            {CALENDAR_HOURS.map((hour) => (
              <div
                key={hour}
                style={{ height: `${CALENDAR_HOUR_HEIGHT_PX}px` }}
                className="relative"
              >
                <span className="absolute -top-1.5 right-1.5 text-[10px] tabular-nums text-gray-400">
                  {dayjs().hour(hour).format(CALENDAR_DATE_FORMATS.hourLabel)}
                </span>
              </div>
            ))}
          </div>

          {byDay.map(({ day, placed }) => {
            const isToday = day.isSame(today, 'day')
            return (
              <div
                key={day.toISOString()}
                style={{ height: `${CALENDAR_GRID_HEIGHT_PX}px` }}
                className={`relative border-r border-gray-100 last:border-r-0 ${
                  isToday ? 'bg-[var(--cares-primary)]/[0.03]' : ''
                }`}
              >
                {CALENDAR_HOURS.map((hour) => (
                  <div
                    key={hour}
                    style={{ height: `${CALENDAR_HOUR_HEIGHT_PX}px` }}
                    className="border-b border-gray-100"
                  >
                    {/* Half-hour rule — with shorter rows it is the only cue for :30. */}
                    <div className="h-1/2 border-b border-dashed border-gray-100/80" />
                  </div>
                ))}

                {isToday && nowOffset !== null && (
                  <div
                    aria-hidden
                    style={{ top: `${nowOffset}px` }}
                    className="pointer-events-none absolute right-0 left-0 z-10 flex items-center"
                  >
                    <span className="-ml-1 h-2 w-2 rounded-full bg-red-500" />
                    <span className="h-px flex-1 bg-red-500" />
                  </div>
                )}

                {placed.map((item) => (
                  <CalendarEventBlock
                    key={item.event.id}
                    placed={item}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
