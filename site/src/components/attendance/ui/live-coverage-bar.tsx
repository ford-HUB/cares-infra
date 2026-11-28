import { formatPercent } from '../../../constants/formatting'

interface LiveCoverageBarProps {
  /** 0–1 share of elapsed time inside the geofence; null before any ping. */
  ratio?: number | null
}

/** Running figure only; the AI service rules `completed`/`absent` after the event. */
export function LiveCoverageBar({ ratio }: LiveCoverageBarProps) {
  if (ratio == null) {
    return <span className="text-[13px] text-gray-400">—</span>
  }

  const tone =
    ratio >= 0.8 ? 'bg-emerald-500' : ratio >= 0.5 ? 'bg-amber-500' : 'bg-red-400'

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${tone}`}
          style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-[12px] tabular-nums text-gray-600">
        {formatPercent(ratio)}
      </span>
    </div>
  )
}
