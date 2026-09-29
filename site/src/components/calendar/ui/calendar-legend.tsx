import { CALENDAR_CATEGORY_TINTS } from '../../../constants/calendar'
import type { EventCategory } from '../../../types/event'

interface CalendarLegendProps {
  /** Only the categories present in the current range — an unused key is noise. */
  categories: EventCategory[]
}

export function CalendarLegend({ categories }: CalendarLegendProps) {
  if (categories.length === 0) return null

  return (
    <div className="mt-3 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
      {categories.map((category) => (
        <span key={category} className="flex items-center gap-1.5 text-[12px] text-gray-600">
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${CALENDAR_CATEGORY_TINTS[category].dot}`}
          />
          {category}
        </span>
      ))}
    </div>
  )
}
