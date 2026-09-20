import { useEffect, useState } from 'react'
import { RANKING_BOARDS, RANKING_DEFAULT_VIEW } from '../constants/ranking'
import { usePortalRole } from '../store/auth-store'
import { useRankingStore } from '../store/ranking-store'
import type { RankingBoard, RankingPeriod, RankingView } from '../types/ranking'

/**
 * Both boards are loaded together and held in the store. Switching view or board is
 * a view change; switching period refetches, since the standings are counted over
 * it on the server. Saved settings rescore the standings too.
 */
export function useRankings() {
  const settings = useRankingStore((state) => state.settings)
  const volunteers = useRankingStore((state) => state.volunteers)
  const donors = useRankingStore((state) => state.donors)
  const volunteerTrend = useRankingStore((state) => state.volunteerTrend)
  const donorTrend = useRankingStore((state) => state.donorTrend)
  const scopeDepartment = useRankingStore((state) => state.scopeDepartment)
  const loading = useRankingStore((state) => state.loading)
  const initialized = useRankingStore((state) => state.initialized)
  const error = useRankingStore((state) => state.error)
  const fetchRankings = useRankingStore((state) => state.fetchRankings)

  const [view, setView] = useState<RankingView>(RANKING_DEFAULT_VIEW)
  const [board, setBoard] = useState<RankingBoard | null>(null)
  const [period, setPeriod] = useState<RankingPeriod | null>(null)

  // A coordinator is ranked against their own college's event record — the server
  // cuts the board for them — and there is no donor side to that record, so the
  // board is pinned to volunteers and the donor tab is not offered.
  const isCoordinator = usePortalRole() === 'coordinator'

  useEffect(() => {
    void fetchRankings(period ?? undefined)
  }, [fetchRankings, period])

  const boards = isCoordinator
    ? RANKING_BOARDS.filter((item) => item.value === 'volunteer')
    : RANKING_BOARDS

  return {
    view,
    setView,
    // Until the operator picks one, the board and period follow the saved defaults.
    board: isCoordinator ? 'volunteer' : (board ?? settings.defaultBoard),
    setBoard,
    boards,
    period: period ?? settings.defaultPeriod,
    setPeriod,
    settings,
    volunteers,
    donors,
    volunteerTrend,
    donorTrend,
    scopeDepartment,
    error,
    loading: loading || !initialized,
  }
}
