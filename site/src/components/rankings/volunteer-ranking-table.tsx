import {
  RANKING_CELL_BASE,
  RANKING_CELL_BORDER,
  VOLUNTEER_RANKING_COLUMNS,
} from '../../constants/ranking'
import { formatDateShort, formatNumber } from '../../constants/formatting'
import type {
  RankingSettings,
  RankingTier,
  VolunteerRankingEntry,
} from '../../types/ranking'
import { UserAvatar } from '../portal/ui/user-avatar'
import { RankMedal } from './ui/rank-medal'
import { RankTierFrame } from './ui/rank-tier-frame'
import { RankingTableShell } from './ui/ranking-table-shell'

interface VolunteerRankingTableProps {
  entries: VolunteerRankingEntry[]
  tiers: RankingTier[]
  settings: RankingSettings
  loading: boolean
}

/**
 * Volunteers are scored on attendance only: every attended event earns points and
 * every registered event skipped costs an escalating penalty. Donations never enter
 * this board.
 */
export function VolunteerRankingTable({
  entries,
  tiers,
  settings,
  loading,
}: VolunteerRankingTableProps) {
  return (
    <RankingTableShell
      columns={VOLUNTEER_RANKING_COLUMNS}
      loading={loading}
      isEmpty={entries.length === 0}
      emptyMessage="No volunteer has a ruled attendance for this period yet."
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

          <td
            className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE} text-gray-900`}
            title={`${formatNumber(entry.hours)} service hours credited`}
          >
            {formatNumber(entry.eventsJoined)}
          </td>

          {/* A live streak is flagged: the next miss costs more than the last. */}
          <td className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE}`}>
            <span className={entry.eventsMissed > 0 ? 'text-red-600' : 'text-gray-600'}>
              {formatNumber(entry.eventsMissed)}
            </span>
            {entry.currentStreak > 0 && (
              <span
                className="ml-1.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700"
                title={`${entry.currentStreak} straight ${
                  entry.currentStreak === 1 ? 'miss' : 'misses'
                } — the next one costs ${
                  settings.absencePenaltyStep * (entry.currentStreak + 1)
                } pts`}
              >
                ×{entry.currentStreak}
              </span>
            )}
          </td>

          <td className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE} text-gray-600`}>
            {entry.lastActiveAt ? formatDateShort(entry.lastActiveAt) : '—'}
          </td>

          <td
            className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE}`}
            title={`+${formatNumber(entry.pointsEarned)} earned − ${formatNumber(
              entry.pointsDeducted,
            )} deducted`}
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
