import { useEffect, useState } from 'react'
import { RANKING_BOARDS, RANKING_DEFAULT_VIEW } from '../constants/ranking'
import { usePortalRole } from '../store/auth-store'
import { useProfileStore } from '../store/profile-store'
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

  // A coordinator is ranked against their own college's event record, and there is no
  // donor side to that record — so the board is pinned to volunteers and the donor tab
  // is not offered. The fetch waits for the profile so the department is known.
  const isCoordinator = usePortalRole() === 'coordinator'
  const profileDepartment = useProfileStore((s) => s.profile?.department)
  const ensureProfile = useProfileStore((s) => s.ensureProfile)

  useEffect(() => {
    if (!isCoordinator) {
      void fetchRankings()
      return
    }
    void ensureProfile()
    if (profileDepartment !== undefined) void fetchRankings(profileDepartment)
  }, [ensureProfile, fetchRankings, isCoordinator, profileDepartment])

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
    loading: loading || !initialized || (isCoordinator && profileDepartment === undefined),
  }
}
