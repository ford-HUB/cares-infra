import {
  RANKING_BOARDS,
  RANKING_PERIODS,
  RANKING_VIEWS,
  boardCriteria,
  formatPoints,
} from '../../constants/ranking'
import { formatCurrency, formatNumber } from '../../constants/formatting'
import type {
  DonorRankingEntry,
  RankingBoard,
  RankingLeader,
  RankingPeriod,
  RankingSettings,
  RankingTrend,
  RankingView,
  VolunteerRankingEntry,
} from '../../types/ranking'
import { DonorRankingTable } from './donor-ranking-table'
import { RankingsDashboard } from './rankings-dashboard'
import { VolunteerRankingTable } from './volunteer-ranking-table'

interface RankingsBoardProps {
  view: RankingView
  board: RankingBoard
  period: RankingPeriod
  settings: RankingSettings
  volunteers: VolunteerRankingEntry[]
  donors: DonorRankingEntry[]
  volunteerTrend: RankingTrend
  donorTrend: RankingTrend
  loading: boolean
  onViewChange: (view: RankingView) => void
  onBoardChange: (board: RankingBoard) => void
  onPeriodChange: (period: RankingPeriod) => void
}

const selectClass =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

const PODIUM_SIZE = 3

/**
 * Two standings, never one: volunteers are ranked on service hours and donors on
 * amount given, so the boards are switched between rather than combined. Each board
 * is shown either as its dashboard or as its full list — the `view` tabs pick which.
 */
export function RankingsBoard({
  view,
  board,
  period,
  settings,
  volunteers,
  donors,
  volunteerTrend,
  donorTrend,
  loading,
  onViewChange,
  onBoardChange,
  onPeriodChange,
}: RankingsBoardProps) {
  const isVolunteerBoard = board === 'volunteer'

  const volunteerHours = volunteers.reduce((total, entry) => total + entry.hours, 0)
  const volunteerPoints = volunteers.reduce((total, entry) => total + entry.points, 0)
  const donorAmount = donors.reduce((total, entry) => total + entry.amount, 0)
  const donorPoints = donors.reduce((total, entry) => total + entry.points, 0)

  // Both boards map into the same podium shape so the podium stays criteria-agnostic.
  const leaders: RankingLeader[] = isVolunteerBoard
    ? volunteers.slice(0, PODIUM_SIZE).map((entry) => ({
        id: entry.id,
        rank: entry.rank,
        name: `${entry.firstName} ${entry.lastName}`,
        subtitle: `${formatNumber(entry.hours)} hrs`,
        points: entry.points,
      }))
    : donors.slice(0, PODIUM_SIZE).map((entry) => ({
        id: entry.id,
        rank: entry.rank,
        name: entry.name,
        subtitle: formatCurrency(entry.amount),
        points: entry.points,
      }))

  const leader = leaders.find((entry) => entry.rank === 1)

  const tiles = isVolunteerBoard
    ? [
        {
          label: 'Ranked Volunteers',
          value: formatNumber(volunteers.length),
          hint: `Scored at ${settings.volunteerPointsPerHour} points per service hour`,
        },
        {
          label: 'Total Service Hours',
          value: `${formatNumber(volunteerHours)} hrs`,
          hint: `${formatPoints(volunteerPoints)} awarded in total`,
        },
        {
          label: 'Top Volunteer',
          value: leader?.name ?? '—',
          hint: leader ? formatPoints(leader.points) : 'No standings yet',
        },
      ]
    : [
        {
          label: 'Ranked Donors',
          value: formatNumber(donors.length),
          hint: `Scored at 1 point per ₱${settings.donorPesosPerPoint} donated`,
        },
        {
          label: 'Total Donated',
          value: formatCurrency(donorAmount),
          hint: `${formatPoints(donorPoints)} awarded in total`,
        },
        {
          label: 'Top Donor',
          value: leader?.name ?? '—',
          hint: leader ? formatPoints(leader.points) : 'No standings yet',
        },
      ]

  return (
    <>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Rankings</h1>
          <p className="text-[13px] text-gray-500">{boardCriteria(board, settings)}</p>
        </div>

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
          {RANKING_BOARDS.map((item) => (
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

        <select
          aria-label="Ranking period"
          value={period}
          onChange={(event) => onPeriodChange(event.target.value as RankingPeriod)}
          className={`${selectClass} mb-2`}
        >
          {RANKING_PERIODS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-tr-xl rounded-b-xl border border-gray-200 bg-white shadow-sm">
        {view === 'dashboard' ? (
          <RankingsDashboard
            tiles={tiles}
            leaders={leaders}
            tiers={settings.tiers}
            trend={isVolunteerBoard ? volunteerTrend : donorTrend}
            loading={loading}
          />
        ) : isVolunteerBoard ? (
          <VolunteerRankingTable
            entries={volunteers}
            tiers={settings.tiers}
            loading={loading}
          />
        ) : (
          <DonorRankingTable entries={donors} tiers={settings.tiers} loading={loading} />
        )}
      </div>
    </>
  )
}
