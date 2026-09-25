import {
  DEPARTMENT_RANKING_COLUMNS,
  RANKING_CELL_BASE,
  RANKING_CELL_BORDER,
  formatHours,
  formatScore,
} from '../../constants/ranking'
import { formatCurrency, formatNumber } from '../../constants/formatting'
import type {
  DepartmentRankingBasis,
  DisplayedDepartment,
  RankingTier,
} from '../../types/ranking'
import { RankMedal } from './ui/rank-medal'
import { RankTierFrame } from './ui/rank-tier-frame'
import { RankingTableShell } from './ui/ranking-table-shell'

interface DepartmentRankingTableProps {
  /** Already ordered and ranked on `basis`, and narrowed by the search. */
  entries: DisplayedDepartment[]
  basis: DepartmentRankingBasis
  tiers: RankingTier[]
  loading: boolean
  emptyMessage: string
}

const ACTIVE_FIGURE = 'font-semibold text-[var(--cares-primary)]'
const IDLE_FIGURE = 'text-gray-900'

/**
 * Colleges on volunteer hours and confirmed donations. Whichever figure the board
 * is ordered on is drawn in the accent colour, so the rank column always reads
 * against the number that produced it.
 */
export function DepartmentRankingTable({
  entries,
  basis,
  tiers,
  loading,
  emptyMessage,
}: DepartmentRankingTableProps) {
  return (
    <RankingTableShell
      columns={DEPARTMENT_RANKING_COLUMNS}
      loading={loading}
      isEmpty={entries.length === 0}
      emptyMessage={emptyMessage}
    >
      {entries.map((entry) => (
        <tr key={entry.id} className="odd:bg-gray-50/40 hover:bg-green-50/60">
          <td className={`${RANKING_CELL_BASE} w-20`}>
            <RankMedal rank={entry.rank} previousRank={entry.previousRank} />
          </td>

          <td className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE}`}>
            <div className="flex items-center gap-2.5">
              <RankTierFrame rank={entry.rank} tiers={tiers} size="sm">
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--cares-primary)] text-[9px] font-semibold text-white"
                >
                  {entry.code ?? entry.name.slice(0, 2).toUpperCase()}
                </span>
              </RankTierFrame>
              <span className="min-w-0">
                <span className="block truncate font-medium text-gray-900">{entry.name}</span>
                <span className="block truncate text-[11px] text-gray-500">
                  {formatNumber(entry.eventsAttended)} attendances
                </span>
              </span>
            </div>
          </td>

          <td className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE} text-gray-600`}>
            {formatNumber(entry.volunteers)}
          </td>

          <td className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE}`}>
            <span className={basis === 'hours' ? ACTIVE_FIGURE : IDLE_FIGURE}>
              {formatHours(entry.hours)}
            </span>
          </td>

          <td className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE}`}>
            <span className={basis === 'donations' ? ACTIVE_FIGURE : IDLE_FIGURE}>
              {formatCurrency(entry.donationAmount)}
            </span>
            <span className="block text-[11px] text-gray-500">
              {formatNumber(entry.donations)} confirmed
            </span>
          </td>

          {/* Half the college's share of all hours, half its share of all pesos. */}
          <td
            className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE}`}
            title="Half this college's share of all service hours, half its share of all donations"
          >
            <span className={basis === 'overall' ? ACTIVE_FIGURE : IDLE_FIGURE}>
              {formatScore(entry.score)}
            </span>
            <span
              aria-hidden
              className="mt-1 block h-1 w-full max-w-[7rem] overflow-hidden rounded-full bg-gray-100"
            >
              <span
                className="block h-full rounded-full bg-[var(--cares-primary)]"
                style={{ width: `${Math.min(100, entry.score)}%` }}
              />
            </span>
          </td>
        </tr>
      ))}
    </RankingTableShell>
  )
}
