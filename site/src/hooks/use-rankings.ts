import { useEffect, useState } from 'react'
import { RANKING_DEFAULT_VIEW } from '../constants/ranking'
import { useRankingStore } from '../store/ranking-store'
import type { RankingBoard, RankingPeriod, RankingView } from '../types/ranking'

/**
 * Both boards are loaded together and held in the store: switching view, board, or
 * period is a view change, not a refetch — only saved settings rescore the standings.
 */
export function useRankings() {
  const settings = useRankingStore((state) => state.settings)
  const volunteers = useRankingStore((state) => state.volunteers)
  const donors = useRankingStore((state) => state.donors)
  const volunteerTrend = useRankingStore((state) => state.volunteerTrend)
  const donorTrend = useRankingStore((state) => state.donorTrend)
  const loading = useRankingStore((state) => state.loading)
  const initialized = useRankingStore((state) => state.initialized)
  const fetchRankings = useRankingStore((state) => state.fetchRankings)

  const [view, setView] = useState<RankingView>(RANKING_DEFAULT_VIEW)
  const [board, setBoard] = useState<RankingBoard | null>(null)
  const [period, setPeriod] = useState<RankingPeriod | null>(null)

  useEffect(() => {
    void fetchRankings()
  }, [fetchRankings])

  return {
    view,
    setView,
    // Until the operator picks one, the board and period follow the saved defaults.
    board: board ?? settings.defaultBoard,
    setBoard,
    period: period ?? settings.defaultPeriod,
    setPeriod,
    settings,
    volunteers,
    donors,
    volunteerTrend,
    donorTrend,
    loading: loading || !initialized,
  }
}
