import { FileText, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ANSWER_DEPARTMENT_FILTER_ALL,
  ANSWER_EVENT_FILTER_ALL,
  ANSWER_RATING_FILTER_ALL,
  ANSWER_STATUS_FILTERS,
  type AnswerStatusFilter,
} from '../../constants/evaluation'
import { StarRating } from './ui/star-rating'

interface AnswersToolbarProps {
  search: string
  /** Event id as a string, or `ANSWER_EVENT_FILTER_ALL`. */
  event: string
  /** Every event with at least one response, newest submission first. */
  events: { id: number; title: string }[]
  department: string
  rating: string
  status: AnswerStatusFilter
  departments: string[]
  shown: number
  total: number
  /** Mean star rating across every response, one decimal. */
  averageRating: number
  /** False until the first fetch settles, so the counts don't flash "0 of 0". */
  initialized: boolean
  onSearchChange: (value: string) => void
  onEventChange: (value: string) => void
  onDepartmentChange: (value: string) => void
  onRatingChange: (value: string) => void
  onStatusChange: (value: AnswerStatusFilter) => void
  /** Generates the answers report as a PDF. */
  onExport: () => void
}

const selectClass =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

const RATING_FILTERS = [5, 4, 3, 2, 1]

/** Page header for the answers grid — the same cut as the users master toolbar. */
export function AnswersToolbar({
  search,
  event,
  events,
  department,
  rating,
  status,
  departments,
  shown,
  total,
  averageRating,
  initialized,
  onSearchChange,
  onEventChange,
  onDepartmentChange,
  onRatingChange,
  onStatusChange,
  onExport,
}: AnswersToolbarProps) {
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Answers</h1>
        {initialized ? (
          <>
            <p className="text-[13px] text-gray-500 tabular-nums">
              {shown} of {total} responses
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[12px] text-amber-700">
              <StarRating value={Math.round(averageRating)} />
              <span className="tabular-nums">{averageRating.toFixed(1)} avg</span>
            </span>
          </>
        ) : (
          <>
            <Skeleton aria-hidden className="h-3.5 w-28" />
            <Skeleton aria-hidden className="h-5 w-32 rounded-full" />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search participant or event"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by event"
          value={event}
          onChange={(e) => onEventChange(e.target.value)}
          className={`${selectClass} max-w-56`}
        >
          <option value={ANSWER_EVENT_FILTER_ALL}>All Events</option>
          {events.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by department"
          value={department}
          onChange={(event) => onDepartmentChange(event.target.value)}
          className={selectClass}
        >
          <option value={ANSWER_DEPARTMENT_FILTER_ALL}>All Departments</option>
          {departments.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by rating"
          value={rating}
          onChange={(event) => onRatingChange(event.target.value)}
          className={selectClass}
        >
          <option value={ANSWER_RATING_FILTER_ALL}>All Ratings</option>
          {RATING_FILTERS.map((stars) => (
            <option key={stars} value={stars}>
              {stars} star{stars === 1 ? '' : 's'}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as AnswerStatusFilter)}
          className={selectClass}
        >
          {ANSWER_STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onExport}
          className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
        >
          <FileText className="h-3.5 w-3.5" />
          Export PDF
        </button>
      </div>
    </div>
  )
}
