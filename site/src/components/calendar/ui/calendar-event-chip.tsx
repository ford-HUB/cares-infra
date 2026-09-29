import dayjs from 'dayjs'
import {
  CALENDAR_CATEGORY_TINTS,
  CALENDAR_DATE_FORMATS,
} from '../../../constants/calendar'
import type { CalendarEvent } from '../../../types/calendar'

interface CalendarEventChipProps {
  event: CalendarEvent
  onSelect: (event: CalendarEvent) => void
}

/** One event as a single line — the month grid and the all-day rail both use it. */
export function CalendarEventChip({ event, onSelect }: CalendarEventChipProps) {
  const tint = CALENDAR_CATEGORY_TINTS[event.category]
  const time = event.allDay
    ? 'All day'
    : dayjs(event.start).format(CALENDAR_DATE_FORMATS.time)

  return (
    <button
      type="button"
      onClick={(clickEvent) => {
        // The month cell itself drills into the day, so the chip must not do both.
        clickEvent.stopPropagation()
        onSelect(event)
      }}
      title={`${time} · ${event.title}`}
      className={`flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-[11px] transition-opacity hover:opacity-80 ${tint.chip} ${
        event.status === 'Cancelled' ? 'opacity-60' : ''
      }`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tint.dot}`} aria-hidden />
      <span className="shrink-0 tabular-nums opacity-80">{time}</span>
      <span
        className={`min-w-0 flex-1 truncate font-medium ${
          event.status === 'Cancelled' ? 'line-through' : ''
        }`}
      >
        {event.title}
      </span>
    </button>
  )
}
