import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  max?: number
  size?: 'sm' | 'md'
  /** Shows "4/5" beside the stars — used in table rows where the stars alone are small. */
  showValue?: boolean
  /** Interactive stars for the builder preview; read-only when omitted. */
  onChange?: (value: number) => void
}

/**
 * The one star renderer for the module — the builder preview, the answers row and
 * the answer modal all draw stars through here so they cannot drift apart.
 */
export function StarRating({
  value,
  max = 5,
  size = 'sm',
  showValue = false,
  onChange,
}: StarRatingProps) {
  const dimension = size === 'md' ? 'h-5 w-5' : 'h-3.5 w-3.5'

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        role={onChange ? 'radiogroup' : 'img'}
        aria-label={`${value} of ${max} stars`}
        className="inline-flex items-center gap-0.5"
      >
        {Array.from({ length: max }, (_, index) => {
          const filled = index < value
          const star = (
            <Star
              className={`${dimension} ${
                filled ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-300'
              }`}
            />
          )
          if (!onChange) return <span key={index}>{star}</span>
          return (
            <button
              key={index}
              type="button"
              role="radio"
              aria-checked={index + 1 === value}
              aria-label={`${index + 1} star${index === 0 ? '' : 's'}`}
              onClick={() => onChange(index + 1)}
              className="rounded-sm transition-colors hover:text-amber-400 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
            >
              {star}
            </button>
          )
        })}
      </span>
      {showValue && (
        <span className="text-[12px] text-gray-500 tabular-nums">
          {value}/{max}
        </span>
      )}
    </span>
  )
}
