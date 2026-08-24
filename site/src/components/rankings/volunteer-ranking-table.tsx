import {
  RANKING_CELL_BASE,
  RANKING_CELL_BORDER,
  VOLUNTEER_POINTS_PER_HOUR,
  VOLUNTEER_RANKING_COLUMNS,
} from '../../constants/ranking'
import { formatDateShort, formatNumber } from '../../constants/formatting'
import type { VolunteerRankingEntry, RankingTier } from '../../types/ranking'
import { UserAvatar } from '../portal/ui/user-avatar'
import { RankMedal } from './ui/rank-medal'
import { RankTierFrame } from './ui/rank-tier-frame'
import { RankingTableShell } from './ui/ranking-table-shell'

interface VolunteerRankingTableProps {
  entries: VolunteerRankingEntry[]
  tiers: RankingTier[]
  loading: boolean
}

/** Volunteers are scored on service hours only — donations never enter this board. */
export function VolunteerRankingTable({ entries, tiers, loading }: VolunteerRankingTableProps) {
  return (
    <RankingTableShell
      columns={VOLUNTEER_RANKING_COLUMNS}
      loading={loading}
      isEmpty={entries.length === 0}
      emptyMessage="No volunteer has logged service hours for this period yet."
    >
      {entries.map((entry) => (
        <tr key={entry.id} className="odd:bg-gray-50/40 hover:bg-green-50/60">
          <td className={`${RANKING_CELL_BASE} w-20`}>
            <RankMedal rank={entry.rank} previousRank={entry.previousRank} />
          </td>

          <td className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE}`}>
            <div className="flex items-center gap-2.5">
              <RankTierFrame rank={entry.rank} tiers={tiers} size="sm">
                <UserAvatar firstName={entry.firstName} lastName={entry.lastName} />
              </RankTierFrame>
              <span className="min-w-0">
                <span className="block truncate font-medium text-gray-900">
                  {entry.firstName} {entry.lastName}
                </span>
                <span className="block truncate text-[11px] text-gray-500">
                  {entry.email}
                </span>
              </span>
            </div>
          </td>

          <td className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE} text-gray-600`}>
            {entry.department}
          </td>

          <td className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE} text-gray-900`}>
            {formatNumber(entry.hours)}
          </td>

          <td className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE} text-gray-600`}>
            {formatNumber(entry.eventsJoined)}
          </td>

          <td className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE} text-gray-600`}>
            {formatDateShort(entry.lastActiveAt)}
          </td>

          <td
            className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE}`}
            title={`${formatNumber(entry.hours)} hours × ${VOLUNTEER_POINTS_PER_HOUR} points`}
          >
            <span className="font-semibold text-[var(--cares-primary)]">
              {formatNumber(entry.points)}
            </span>
            <span className="ml-1 text-[11px] text-gray-400">pts</span>
          </td>
        </tr>
      ))}
    </RankingTableShell>
  )
}
