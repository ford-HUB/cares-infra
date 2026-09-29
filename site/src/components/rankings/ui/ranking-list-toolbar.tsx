import { Search, X } from 'lucide-react'
import { formatNumber } from '../../../constants/formatting'

export interface RankingListFilter {
  /** Accessible name — the select has no visible label. */
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

interface RankingListToolbarProps {
  search: string
  placeholder: string
  onSearchChange: (value: string) => void
  /** The active board's own filter. */
  filter: RankingListFilter
  shown: number
  total: number
  /** Noun for the count, plural — `volunteers`, `departments`. */
  noun: string
}

const controlClass =
  'h-9 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

/**
 * Search and the board's filter, above the standings. Both narrow the list only —
 * the rank column still shows each row's standing on the whole board.
 */
export function RankingListToolbar({
  search,
  placeholder,
  onSearchChange,
  filter,
  shown,
  total,
  noun,
}: RankingListToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-gray-100 p-3">
      <div className="relative min-w-56 flex-1">
        <Search
          aria-hidden
          className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          aria-label={placeholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          className={`${controlClass} w-full pr-8 pl-9`}
        />
        {search && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onSearchChange('')}
            className="absolute top-1/2 right-2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>

      <select
        aria-label={filter.label}
        value={filter.value}
        onChange={(event) => filter.onChange(event.target.value)}
        className={`${controlClass} px-3`}
      >
        {filter.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <p className="text-[12px] text-gray-500" aria-live="polite">
        {shown === total
          ? `${formatNumber(total)} ${noun}`
          : `${formatNumber(shown)} of ${formatNumber(total)} ${noun}`}
      </p>
    </div>
  )
}
