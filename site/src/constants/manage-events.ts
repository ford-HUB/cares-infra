/** Fixed row metrics — the grid measures its container against these to fill the viewport. */
export const EVENT_ROW_HEIGHT_PX = 48
export const EVENT_HEADER_HEIGHT_PX = 36

export type EventSortKey =
  | 'event_id'
  | 'title'
  | 'location'
  | 'type'
  | 'status'
  | 'date'

export const EVENT_COLUMNS = [
  { key: 'event_id', label: 'ID No', width: 'w-[7%]', sortKey: 'event_id' },
  { key: 'organizer', label: 'Organizer', width: 'w-[12%]', sortKey: null },
  { key: 'title', label: 'Event Name', width: 'w-[18%]', sortKey: 'title' },
  { key: 'location', label: 'Venue', width: 'w-[13%]', sortKey: 'location' },
  { key: 'type', label: 'Type', width: 'w-[10%]', sortKey: 'type' },
  { key: 'participants', label: 'Current/Max', width: 'w-[9%]', sortKey: null },
  { key: 'time', label: 'Time', width: 'w-[11%]', sortKey: null },
  { key: 'status', label: 'Status', width: 'w-[10%]', sortKey: 'status' },
  { key: 'date', label: 'Date', width: 'w-[10%]', sortKey: 'date' },
  { key: 'actions', label: '', width: 'w-14', sortKey: null },
] as const satisfies readonly {
  key: string
  label: string
  width: string
  sortKey: EventSortKey | null
}[]

/**
 * Cell classes shared by the events table and its loading skeleton. They live here so
 * the skeleton cannot drift from the real row — a height mismatch is exactly the
 * layout jump the skeleton exists to prevent.
 */
export const EVENT_CELL_BORDER = 'border-r border-gray-100 last:border-r-0'
export const EVENT_CELL_BASE =
  'h-12 truncate border-b border-gray-100 px-3 py-0 text-[13px]'
export const EVENT_GUTTER_CELL =
  'sticky left-0 z-10 w-10 border-r border-gray-200 bg-gray-50 text-center text-[11px] tabular-nums text-gray-400'
