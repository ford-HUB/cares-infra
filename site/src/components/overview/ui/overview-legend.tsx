import { formatNumber, formatPercent } from '../../../constants/formatting'
import type { OverviewSlice } from './overview-slice'

interface OverviewLegendProps {
  slices: OverviewSlice[]
  /** The whole the slices divide, so every count carries its denominator. */
  total: number
  /** Two columns under a donut, one column beside a bar. */
  columns?: 1 | 2
}

/**
 * The key for a part-to-whole chart: swatch, label, count, share. Identity never rides
 * on colour alone — the label is always next to the swatch.
 */
export function OverviewLegend({ slices, total, columns = 2 }: OverviewLegendProps) {
  return (
    <ul
      className={`grid gap-x-4 gap-y-1.5 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
    >
      {slices.map((slice) => (
        <li key={slice.key} className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: slice.color }}
          />
          <span className="min-w-0 flex-1 truncate text-[12px] text-gray-600">
            {slice.label}
          </span>
          <span className="text-[13px] font-semibold text-gray-900 tabular-nums">
            {formatNumber(slice.value)}
          </span>
          <span className="w-9 text-right text-[11px] text-gray-400 tabular-nums">
            {formatPercent(total > 0 ? slice.value / total : 0)}
          </span>
        </li>
      ))}
    </ul>
  )
}
