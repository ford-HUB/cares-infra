import {
  DEPARTMENT_RANKING_BASES,
  RANKING_PERIODS,
  RANKING_VIEWS,
  boardCriteria,
} from '../../constants/ranking'
import type {
  DepartmentRankingBasis,
  RankingBoard,
  RankingPeriod,
  RankingSettings,
  RankingTrend,
  RankingView,
} from '../../types/ranking'
import { rankingDashboard } from '../../utils/ranking-dashboard'
import { RankingList, type RankingListProps } from './ranking-list'
import { RankingsDashboard } from './rankings-dashboard'

type ListProps = Omit<RankingListProps, 'board' | 'settings' | 'loading'>

interface RankingsBoardProps {
  view: RankingView
  board: RankingBoard
  /** The tabs on offer; a coordinator's board has only the volunteer side. */
  boards: { value: RankingBoard; label: string }[]
  period: RankingPeriod
  settings: RankingSettings
  /** Whole, unfiltered boards — the dashboard never follows the list's search. */
  dashboard: Omit<Parameters<typeof rankingDashboard>[0], 'board' | 'settings'>
  volunteerTrend: RankingTrend
  donorTrend: RankingTrend
  /** Search, filters, and the narrowed rows for the Ranking List tab. */
  list: ListProps
  error: string | null
  loading: boolean
  onViewChange: (view: RankingView) => void
  onBoardChange: (board: RankingBoard) => void
  onPeriodChange: (period: RankingPeriod) => void
}

const selectClass =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

/**
 * Three standings, never one: volunteers are ranked on attendance, donors on amount
 * given, and colleges on their volunteers' hours and the donations to their events,
 * so the boards are switched between rather than combined. Each board is shown
 * either as its dashboard or as its full list — the `view` tabs pick which.
 */
export function RankingsBoard({
  view,
  board,
  boards,
  period,
  settings,
  dashboard,
  volunteerTrend,
  donorTrend,
  list,
  error,
  loading,
  onViewChange,
  onBoardChange,
  onPeriodChange,
}: RankingsBoardProps) {
  const { tiles, leaders } = rankingDashboard({ ...dashboard, board, settings })
  const trend =
    board === 'volunteer' ? volunteerTrend : board === 'donor' ? donorTrend : undefined

  // The list carries the basis in its own toolbar; the dashboard needs it up here
  // so the podium can be re-ordered without leaving the tab.
  const showBasis = board === 'department' && view === 'dashboard'

  return (
    <>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Rankings</h1>
          <p className="text-[13px] text-gray-500">{boardCriteria(board, settings)}</p>
        </div>
        {error && (
          <p role="alert" className="text-[13px] text-red-600">
            {error}
          </p>
        )}

        {/* Dashboard vs list — the underline tabs own the whole page below them. */}
        <div
          role="tablist"
          aria-label="Ranking view"
          className="flex gap-6 border-b border-gray-200"
        >
          {RANKING_VIEWS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={item.value === view}
              onClick={() => onViewChange(item.value)}
              className={`-mb-px border-b-2 px-1 pb-2.5 text-[13px] font-medium transition-colors ${
                item.value === view
                  ? 'border-[var(--cares-primary)] text-[var(--cares-primary)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2.5">
        {/*
          Board tabs sit on the panel's top edge like browser tabs: the active one
          paints over the panel border so the two read as a single surface.
        */}
        <div role="tablist" aria-label="Ranking board" className="-mb-px flex gap-1">
          {boards.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={item.value === board}
              onClick={() => onBoardChange(item.value)}
              className={`h-9 rounded-t-lg border px-4 text-[13px] font-medium transition-colors ${
                item.value === board
                  ? 'border-gray-200 border-b-white bg-white font-semibold text-[var(--cares-primary)]'
                  : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mb-2 flex flex-wrap gap-2">
          {showBasis && (
            <select
              aria-label="Rank departments by"
              value={list.departmentBasis}
              onChange={(event) =>
                list.onDepartmentBasisChange(event.target.value as DepartmentRankingBasis)
              }
              className={selectClass}
            >
              {DEPARTMENT_RANKING_BASES.map((item) => (
                <option key={item.value} value={item.value}>
                  Rank by: {item.label}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label="Ranking period"
            value={period}
            onChange={(event) => onPeriodChange(event.target.value as RankingPeriod)}
            className={selectClass}
          >
            {RANKING_PERIODS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-tr-xl rounded-b-xl border border-gray-200 bg-white shadow-sm">
        {view === 'dashboard' ? (
          <RankingsDashboard
            tiles={tiles}
            leaders={leaders}
            tiers={settings.tiers}
            trend={trend}
            loading={loading}
          />
        ) : (
          <RankingList {...list} board={board} settings={settings} loading={loading} />
        )}
      </div>
    </>
  )
}
