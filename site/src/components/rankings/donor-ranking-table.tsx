import { Building2, User } from 'lucide-react'
import {
  DONOR_PESOS_PER_POINT,
  DONOR_RANKING_COLUMNS,
  DONOR_TYPE_LABELS,
  RANKING_CELL_BASE,
  RANKING_CELL_BORDER,
} from '../../constants/ranking'
import {
  formatCurrency,
  formatDateShort,
  formatNumber,
} from '../../constants/formatting'
import type { DonorRankingEntry, RankingTier } from '../../types/ranking'
import { RankMedal } from './ui/rank-medal'
import { RankTierFrame } from './ui/rank-tier-frame'
import { RankingTableShell } from './ui/ranking-table-shell'

interface DonorRankingTableProps {
  entries: DonorRankingEntry[]
  tiers: RankingTier[]
  loading: boolean
}

/** Donors are scored on amount given — hours never enter this board. */
export function DonorRankingTable({ entries, tiers, loading }: DonorRankingTableProps) {
  return (
    <RankingTableShell
      columns={DONOR_RANKING_COLUMNS}
      loading={loading}
      isEmpty={entries.length === 0}
      emptyMessage="No donation has been recorded for this period yet."
    >
      {entries.map((entry) => {
        const Icon = entry.donorType === 'organization' ? Building2 : User

        return (
          <tr key={entry.id} className="odd:bg-gray-50/40 hover:bg-green-50/60">
            <td className={`${RANKING_CELL_BASE} w-20`}>
              <RankMedal rank={entry.rank} previousRank={entry.previousRank} />
            </td>

            <td className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE}`}>
              <div className="flex items-center gap-2.5">
                <RankTierFrame rank={entry.rank} tiers={tiers} size="sm">
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--cares-primary)] text-white"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </RankTierFrame>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-900">
                    {entry.name}
                  </span>
                  <span className="block truncate text-[11px] text-gray-500">
                    {entry.email}
                  </span>
                </span>
              </div>
            </td>

            <td className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE} text-gray-600`}>
              {DONOR_TYPE_LABELS[entry.donorType]}
            </td>

            <td className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE} text-gray-900`}>
              {formatCurrency(entry.amount)}
            </td>

            <td className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE} text-gray-600`}>
              {formatNumber(entry.donations)}
            </td>

            <td className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE} text-gray-600`}>
              {formatDateShort(entry.lastDonatedAt)}
            </td>

            <td
              className={`${RANKING_CELL_BORDER} ${RANKING_CELL_BASE}`}
              title={`${formatCurrency(entry.amount)} ÷ ${DONOR_PESOS_PER_POINT}`}
            >
              <span className="font-semibold text-[var(--cares-primary)]">
                {formatNumber(entry.points)}
              </span>
              <span className="ml-1 text-[11px] text-gray-400">pts</span>
            </td>
          </tr>
        )
      })}
    </RankingTableShell>
  )
}
