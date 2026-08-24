import dayjs, { type Dayjs } from 'dayjs'
import {
  CALENDAR_END_HOUR,
  CALENDAR_GRID_HEIGHT_PX,
  CALENDAR_HOUR_HEIGHT_PX,
  CALENDAR_MIN_BLOCK_HEIGHT_PX,
  CALENDAR_START_HOUR,
  DAYS_PER_WEEK,
  MONTH_GRID_WEEKS,
} from '../constants/calendar'
import type { CalendarEvent, PositionedCalendarEvent } from '../types/calendar'

const MINUTES_PER_HOUR = 60

/** Offset in pixels from the top of the time grid, clamped to the drawn span. */
function offsetPx(moment: Dayjs): number {
  const minutes = moment.hour() * MINUTES_PER_HOUR + moment.minute()
  const from = (minutes - CALENDAR_START_HOUR * MINUTES_PER_HOUR) / MINUTES_PER_HOUR
  const clamped = Math.min(Math.max(from, 0), CALENDAR_END_HOUR - CALENDAR_START_HOUR)
  return clamped * CALENDAR_HOUR_HEIGHT_PX
}

/** The seven days of the week `date` falls in, Sunday first. */
export function weekDays(date: Dayjs): Dayjs[] {
  const start = date.startOf('week')
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) => start.add(index, 'day'))
}

/** The 6×7 cells a month grid draws, including the leading and trailing spill days. */
export function monthGridDays(date: Dayjs): Dayjs[] {
  const start = date.startOf('month').startOf('week')
  return Array.from({ length: MONTH_GRID_WEEKS * DAYS_PER_WEEK }, (_, index) =>
    start.add(index, 'day'),
  )
}

export function eventsOnDay(events: CalendarEvent[], day: Dayjs): CalendarEvent[] {
  return events
    .filter((event) => dayjs(event.start).isSame(day, 'day'))
    .sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf())
}

/**
 * Place one day's timed events into the grid. Events that overlap in time are
 * split across the column's width — without this every concurrent event stacks
 * on the same pixels and only the last one is readable.
 */
export function positionDayEvents(events: CalendarEvent[]): PositionedCalendarEvent[] {
  const timed = events
    .filter((event) => !event.allDay)
    .sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf())

  const placed: PositionedCalendarEvent[] = []
  // Events are walked in start order, so a group ends as soon as one starts after
  // every member of the current group has finished.
  let group: PositionedCalendarEvent[] = []
  let groupEnd = 0

  const closeGroup = () => {
    group.forEach((item) => {
      item.columns = group.length
    })
    placed.push(...group)
    group = []
    groupEnd = 0
  }

  timed.forEach((event) => {
    const start = dayjs(event.start)
    const end = dayjs(event.end)
    const top = offsetPx(start)
    const height = Math.max(
      offsetPx(end) - top,
      CALENDAR_MIN_BLOCK_HEIGHT_PX,
    )

    if (group.length > 0 && start.valueOf() >= groupEnd) closeGroup()

    group.push({ event, top, height, column: group.length, columns: 1 })
    groupEnd = Math.max(groupEnd, end.valueOf())
  })

  if (group.length > 0) closeGroup()

  return placed
}

/** Where the "now" line sits, or null when today is outside the drawn span. */
export function nowIndicatorOffset(now: Dayjs = dayjs()): number | null {
  const hour = now.hour()
  if (hour < CALENDAR_START_HOUR || hour >= CALENDAR_END_HOUR) return null
  const offset = offsetPx(now)
  return offset > CALENDAR_GRID_HEIGHT_PX ? null : offset
}
