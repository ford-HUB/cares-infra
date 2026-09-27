import { LayoutGrid, List, PlusCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  FORM_SORT_OPTIONS,
  type FormSort,
  type FormViewMode,
} from '../../constants/evaluation-forms'

interface EvaluationFormsToolbarProps {
  search: string
  sort: FormSort
  view: FormViewMode
  shown: number
  total: number
  /** False until the first fetch settles, so the count doesn't flash "0 of 0". */
  initialized: boolean
  onSearchChange: (value: string) => void
  onSortChange: (value: FormSort) => void
  onViewChange: (value: FormViewMode) => void
  onCreate: () => void
}

const selectClass =
  'h-9 max-w-56 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

export function EvaluationFormsToolbar({
  search,
  sort,
  view,
  shown,
  total,
  initialized,
  onSearchChange,
  onSortChange,
  onViewChange,
  onCreate,
}: EvaluationFormsToolbarProps) {
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Forms</h1>
        {initialized ? (
          <p className="text-[13px] text-gray-500 tabular-nums">
            {shown} of {total} questionnaires
          </p>
        ) : (
          <Skeleton aria-hidden className="h-3.5 w-32" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(input) => onSearchChange(input.target.value)}
            placeholder="Search questionnaire or question"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
          />
        </div>

        <select
          aria-label="Sort questionnaires"
          value={sort}
          onChange={(input) => onSortChange(input.target.value as FormSort)}
          className={selectClass}
        >
          {FORM_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* One choice of two, so a toggle group rather than two ad-hoc buttons. */}
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(value) => value && onViewChange(value as FormViewMode)}
          variant="outline"
          size="sm"
          aria-label="Layout"
        >
          <ToggleGroupItem value="grid" aria-label="Gallery view">
            <LayoutGrid className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="List view">
            <List className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>

        <Button size="sm" className="h-9" onClick={onCreate}>
          <PlusCircle className="h-3.5 w-3.5" />
          New questionnaire
        </Button>
      </div>
    </div>
  )
}
