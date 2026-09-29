import { useEffect, useMemo, useState } from 'react'
import {
  ALL_DEPARTMENTS,
  DEPARTMENT_RANKING_DEFAULT_BASIS,
  RANKING_BOARDS,
  RANKING_DEFAULT_VIEW,
} from '../constants/ranking'
import { usePortalRole } from '../store/auth-store'
import { useRankingStore } from '../store/ranking-store'
import type {
  DepartmentRankingBasis,
  DisplayedDepartment,
  DonorKindFilter,
  RankingBoard,
  RankingPeriod,
  RankingView,
} from '../types/ranking'

function matches(term: string, ...fields: (string | null)[]): boolean {
  return fields.some((field) => field?.toLowerCase().includes(term))
}

/**
 * Every board is loaded together and held in the store. Switching view or board is
 * a view change; switching period refetches, since the standings are counted over
 * it on the server. Saved settings rescore the standings too.
 *
 * Search and filters narrow the list client-side and never re-rank it: a row keeps
 * the standing it earned on the whole board.
 */
export function useRankings() {
  const settings = useRankingStore((state) => state.settings)
  const volunteers = useRankingStore((state) => state.volunteers)
  const donors = useRankingStore((state) => state.donors)
  const departmentRankings = useRankingStore((state) => state.departments)
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
  const [search, setSearch] = useState('')
  const [volunteerDepartment, setVolunteerDepartment] = useState(ALL_DEPARTMENTS)
  const [donorKind, setDonorKind] = useState<DonorKindFilter>('all')
  const [departmentBasis, setDepartmentBasis] = useState<DepartmentRankingBasis>(
    DEPARTMENT_RANKING_DEFAULT_BASIS,
  )

  // A coordinator is ranked against their own college's event record — the server
  // cuts the board for them — and there is no donor side to that record, so the
  // board is pinned to volunteers and the other tabs are not offered.
  const isCoordinator = usePortalRole() === 'coordinator'

  useEffect(() => {
    void fetchRankings(period ?? undefined)
  }, [fetchRankings, period])

  const boards = isCoordinator
    ? RANKING_BOARDS.filter((item) => item.value === 'volunteer')
    : RANKING_BOARDS

  // A search typed for one board rarely makes sense on another.
  const changeBoard = (next: RankingBoard) => {
    setBoard(next)
    setSearch('')
  }

  const term = search.trim().toLowerCase()

  const volunteerDepartments = useMemo(
    () =>
      [...new Set(volunteers.map((entry) => entry.department))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [volunteers],
  )

  const filteredVolunteers = useMemo(
    () =>
      volunteers.filter(
        (entry) =>
          (volunteerDepartment === ALL_DEPARTMENTS ||
            entry.department === volunteerDepartment) &&
          (!term ||
            matches(
              term,
              `${entry.firstName} ${entry.lastName}`,
              entry.email,
              entry.department,
            )),
      ),
    [volunteers, volunteerDepartment, term],
  )

  const filteredDonors = useMemo(
    () =>
      donors.filter(
        (entry) =>
          (donorKind === 'all' ||
            (donorKind === 'money' ? entry.moneyAmount > 0 : entry.goodsAmount > 0)) &&
          (!term || matches(term, entry.name, entry.email)),
      ),
    [donors, donorKind, term],
  )

  // The basis re-orders the whole board (the dashboard podium follows it too);
  // search only narrows the list afterwards.
  const departments = useMemo<DisplayedDepartment[]>(
    () =>
      departmentRankings.entries
        .map((entry) => ({
          ...entry,
          rank: entry.ranks[departmentBasis],
          previousRank: entry.previousRanks?.[departmentBasis],
        }))
        .sort((a, b) => a.rank - b.rank),
    [departmentRankings.entries, departmentBasis],
  )

  const filteredDepartments = useMemo(
    () => (term ? departments.filter((entry) => matches(term, entry.name, entry.code)) : departments),
    [departments, term],
  )

  return {
    view,
    setView,
    // Until the operator picks one, the board and period follow the saved defaults.
    board: isCoordinator ? 'volunteer' : (board ?? settings.defaultBoard),
    setBoard: changeBoard,
    boards,
    period: period ?? settings.defaultPeriod,
    setPeriod,
    settings,
    volunteers,
    donors,
    departments,
    departmentUnattributed: departmentRankings.unattributed,
    filteredVolunteers,
    filteredDonors,
    filteredDepartments,
    search,
    setSearch,
    volunteerDepartment,
    setVolunteerDepartment,
    volunteerDepartments,
    donorKind,
    setDonorKind,
    departmentBasis,
    setDepartmentBasis,
    volunteerTrend,
    donorTrend,
    scopeDepartment,
    error,
    loading: loading || !initialized,
  }
}
