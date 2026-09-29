import { ChevronLeft, ChevronRight } from 'lucide-react'

interface TablePaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

/** Windows the page numbers around the current page so a long list stays one row. */
function pageItems(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const window = [current - 1, current, current + 1].filter(
    (page) => page > 1 && page < total,
  )

  return [
    1,
    ...(window[0] > 2 ? (['gap'] as const) : []),
    ...window,
    ...(window[window.length - 1] < total - 1 ? (['gap'] as const) : []),
    total,
  ]
}

export function TablePagination({
  page,
  totalPages,
  onPageChange,
}: TablePaginationProps) {
  const stepClass =
    'flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40'

  return (
    <nav aria-label="Pagination" className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={stepClass}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pageItems(page, totalPages).map((item, index) =>
        item === 'gap' ? (
          <span
            key={`gap-${index}`}
            aria-hidden
            className="px-1 text-[12px] text-gray-400"
          >
            &hellip;
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onPageChange(item)}
            className={`h-7 min-w-7 rounded-md border px-2 text-[12px] tabular-nums ${
              item === page
                ? 'border-[var(--cares-primary)] bg-[var(--cares-primary)] font-semibold text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={stepClass}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  )
}
