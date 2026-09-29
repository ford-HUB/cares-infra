import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { RANKING_MEDAL_FALLBACK, RANKING_MEDAL_STYLES } from '../../../constants/ranking'

interface RankMedalProps {
  rank: number
  /** Absent for a first-time entrant — no movement can be shown. */
  previousRank?: number
}

/** The standing plus how it moved since the previous period. */
export function RankMedal({ rank, previousRank }: RankMedalProps) {
  const movement = previousRank === undefined ? undefined : previousRank - rank

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold ring-1 ${
          RANKING_MEDAL_STYLES[rank] ?? RANKING_MEDAL_FALLBACK
        }`}
      >
        {rank}
      </span>

      {movement === undefined ? (
        <span className="text-[11px] text-gray-400">new</span>
      ) : movement > 0 ? (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-green-600">
          <TrendingUp className="h-3 w-3" aria-hidden />
          {movement}
        </span>
      ) : movement < 0 ? (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-red-600">
          <TrendingDown className="h-3 w-3" aria-hidden />
          {Math.abs(movement)}
        </span>
      ) : (
        <span className="inline-flex items-center text-[11px] text-gray-400">
          <Minus className="h-3 w-3" aria-hidden />
        </span>
      )}
    </div>
  )
}
