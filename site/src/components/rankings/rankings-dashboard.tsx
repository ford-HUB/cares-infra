import type { RankingLeader, RankingTier, RankingTrend } from '../../types/ranking'
import { RankingPodium } from './ui/ranking-podium'
import { RankingTrendChart } from './ui/ranking-trend-chart'
import { RankingSummary } from './ui/ranking-summary'

interface RankingsDashboardProps {
  tiles: { label: string; value: string; hint: string }[]
  leaders: RankingLeader[]
  tiers: RankingTier[]
  trend: RankingTrend
  loading: boolean
}

/** The Dashboard tab: headline figures for the active board, then its podium. */
export function RankingsDashboard({
  tiles,
  leaders,
  tiers,
  trend,
  loading,
}: RankingsDashboardProps) {
  return (
    <div className="space-y-5 p-5">
      <RankingSummary tiles={tiles} loading={loading} />
      <RankingPodium leaders={leaders} tiers={tiers} loading={loading} />
      <RankingTrendChart trend={trend} loading={loading} />
    </div>
  )
}
