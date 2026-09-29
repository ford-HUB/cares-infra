import dayjs from 'dayjs'
import {
  CALENDAR_BLOCK_SPREAD,
  CALENDAR_CATEGORY_TINTS,
  CALENDAR_DATE_FORMATS,
  CALENDAR_HOUR_HEIGHT_PX,
} from '../../../constants/calendar'
import type { CalendarEvent, PositionedCalendarEvent } from '../../../types/calendar'

interface CalendarEventBlockProps {
  placed: PositionedCalendarEvent
  onSelect: (event: CalendarEvent) => void
}

/** Below one hour row there is only space for the title line. */
const COMPACT_HEIGHT_PX = CALENDAR_HOUR_HEIGHT_PX

/**
 * "7:00 AM – 11:00 AM" rarely fits a week column, so whole hours drop their
 * ":00" and a range inside one meridiem states it once.
 */
function timeLabel(event: CalendarEvent): string {
  const start = dayjs(event.start)
  const end = dayjs(event.end)
  const compact = (moment: dayjs.Dayjs, meridiem: boolean) =>
    moment.format(moment.minute() === 0 ? (meridiem ? 'h A' : 'h') : meridiem ? 'h:mm A' : 'h:mm')
  const sameHalf = start.format('A') === end.format('A')
  return `${compact(start, !sameHalf)} – ${compact(end, true)}`
}

/** One timed event drawn in a day column, sized and offset by the layout util. */
export function CalendarEventBlock({ placed, onSelect }: CalendarEventBlockProps) {
  const { event, top, height, column, columns } = placed
  const tint = CALENDAR_CATEGORY_TINTS[event.category]
  const slot = 100 / columns
  const left = column * slot
  // Blocks fan out over their neighbours rather than splitting the column into
  // unreadable slivers; the last one still stops at the column's edge.
  const width = Math.min(slot * CALENDAR_BLOCK_SPREAD, 100 - left)
  const cancelled = event.status === 'Cancelled'
  const label = timeLabel(event)
  const fullRange = `${dayjs(event.start).format(CALENDAR_DATE_FORMATS.time)} – ${dayjs(event.end).format(CALENDAR_DATE_FORMATS.time)}`

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      title={`${event.title} · ${fullRange}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: `calc(${left}% + 2px)`,
        width: `calc(${width}% - 4px)`,
        zIndex: column + 1,
      }}
      // The block stays fully opaque: a translucent one lets the block it
      // overlaps bleed through and the two titles collide.
      className={`absolute flex overflow-hidden rounded-md text-left ring-1 shadow-sm ring-white transition-colors focus:z-20 focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none hover:z-20 ${tint.block}`}
    >
      <span
        className={`w-1 shrink-0 rounded-l-md ${tint.bar} ${cancelled ? 'opacity-50' : ''}`}
        aria-hidden
      />
      <span className={`min-w-0 flex-1 px-1.5 py-0.5 ${cancelled ? 'opacity-60' : ''}`}>
        <span
          className={`block truncate text-[11px] leading-tight font-semibold ${
            cancelled ? 'line-through' : ''
          }`}
        >
          {event.title}
        </span>
        {height >= COMPACT_HEIGHT_PX && (
          <span className="block truncate text-[10px] leading-tight tabular-nums opacity-75">
            {label}
          </span>
        )}
      </span>
    </button>
  )
}
