import { formatNumber, formatPercent } from '../../../constants/formatting'
import type { YearLevelParticipation } from '../../../types/department-statistics'
import { ChartCard, ChartFigure } from './chart-card'

interface YearLevelParticipationListProps {
  yearLevels: YearLevelParticipation[]
}

/**
 * Of each year level's volunteers, how many actually turned up this period. Each row
 * is a meter — the active share of that level's roster — so the levels compare on
 * rate, not on size.
 */
export function YearLevelParticipationList({
  yearLevels,
}: YearLevelParticipationListProps) {
  const volunteers = yearLevels.reduce((sum, row) => sum + row.volunteers, 0)
  const active = yearLevels.reduce((sum, row) => sum + row.active, 0)

  return (
    <ChartCard
      title="Participation by year level"
      description="Share of each year level's volunteers with a completed attendance."
      aside={
        <ChartFigure
          value={formatPercent(volunteers > 0 ? active / volunteers : 0)}
          label={`${formatNumber(active)} of ${formatNumber(volunteers)} active`}
        />
      }
    >
      <ul className="flex flex-col gap-3">
        {yearLevels.map((row) => {
          const share = row.volunteers > 0 ? row.active / row.volunteers : 0
          return (
            <li key={row.yearLevel}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-gray-700">{row.yearLevel}</span>
                <span className="text-[12px] text-gray-500 tabular-nums">
                  <span className="font-semibold text-gray-900">
                    {formatNumber(row.active)}
                  </span>
                  {' of '}
                  {formatNumber(row.volunteers)}
                  <span className="ml-1.5 text-gray-400">{formatPercent(share)}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[var(--cares-primary-hover)] transition-[width] duration-500"
                  style={{ width: `${share * 100}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </ChartCard>
  )
}
