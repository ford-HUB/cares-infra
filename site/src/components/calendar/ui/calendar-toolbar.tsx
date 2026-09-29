import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CALENDAR_CATEGORY_FILTER_ALL,
  CALENDAR_VIEWS,
} from '../../../constants/calendar'
import { EVENT_CATEGORIES } from '../../../constants/event'
import type { CalendarCategoryFilter } from '../../../hooks/use-event-calendar'
import type { CalendarView } from '../../../types/calendar'

interface CalendarToolbarProps {
  title: string
  view: CalendarView
  category: CalendarCategoryFilter
  /** Events drawn in the current range, after the category filter. */
  shown: number
  total: number
  /** False until the first fetch settles, so the counts don't flash "0 of 0". */
  initialized: boolean
  onViewChange: (view: CalendarView) => void
  onCategoryChange: (category: CalendarCategoryFilter) => void
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
}

const navButtonClass =
  'flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50'

export function CalendarToolbar({
  title,
  view,
  category,
  shown,
  total,
  initialized,
  onViewChange,
  onCategoryChange,
  onPrevious,
  onNext,
  onToday,
}: CalendarToolbarProps) {
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrevious}
            aria-label="Previous period"
            className={navButtonClass}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next period"
            className={navButtonClass}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Today
          </button>
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-gray-900">{title}</h1>
          {initialized ? (
            <p className="text-[13px] text-gray-500">
              {shown} of {total} scheduled events
            </p>
          ) : (
            <Skeleton aria-hidden className="mt-1 h-3.5 w-36" />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(changeEvent) =>
            onCategoryChange(changeEvent.target.value as CalendarCategoryFilter)
          }
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
        >
          <option value={CALENDAR_CATEGORY_FILTER_ALL}>All Categories</option>
          {EVENT_CATEGORIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <div className="flex h-9 items-center rounded-lg border border-gray-200 bg-white p-0.5">
          {CALENDAR_VIEWS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onViewChange(option.value)}
              aria-pressed={view === option.value}
              className={`h-8 rounded-md px-3 text-[13px] font-medium transition-colors ${
                view === option.value
                  ? 'bg-[var(--cares-primary)] text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled
          title="Event creation lives in Manage Event"
          className="flex h-9 items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-3 text-[13px] font-medium text-white transition-colors hover:bg-[var(--cares-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          New Event
        </button>
      </div>
    </div>
  )
}
