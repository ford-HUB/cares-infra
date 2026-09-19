import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDateShort, formatNumber } from '../../../constants/formatting'
import {
  NEED_CATEGORY_LABELS,
  NEED_CATEGORY_ORDER,
  NEED_SCORE_MAX,
  NEEDS_SURVEY_SOURCE_LABEL,
} from '../../../constants/residential-needs'
import { needPriorityOf, totalNeedScore } from '../../../services/residential-needs-mock'
import type { Household } from '../../../types/residential-needs'
import { ClusterSwatch } from './cluster-swatch'
import { NeedPriorityBadge } from './need-priority-badge'

interface HouseholdTableProps {
  households: Household[]
  /** One line above the rows saying what the list is narrowed to. */
  caption: string
  /** Present on the Clusters screen: which group each row landed in. */
  clusterOf?: (household: Household) => number
  emptyMessage?: string
}

const headerClass =
  'px-3 py-2 text-[11px] font-medium tracking-wider text-gray-500 uppercase'
const cellClass = 'px-3 py-2 text-[13px] text-gray-700'
const maxTotal = NEED_CATEGORY_ORDER.length * NEED_SCORE_MAX

/**
 * The survey rows themselves — the content the summary blocks above describe. Each
 * need column is a tiny meter so a row's profile reads at a glance without six
 * digits to compare.
 */
export function HouseholdTable({
  households,
  caption,
  clusterOf,
  emptyMessage = 'No households match this filter.',
}: HouseholdTableProps) {
  const rows = [...households].sort(
    (a, b) => totalNeedScore(b.needs) - totalNeedScore(a.needs),
  )

  return (
    <Card size="sm" className="min-w-0 shadow-sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-gray-900">Surveyed households</p>
            <p className="text-[11px] text-gray-400">
              Answers from the {NEEDS_SURVEY_SOURCE_LABEL} · mock, not wired
            </p>
          </div>
          <p className="text-[12px] text-gray-500 tabular-nums">{caption}</p>
        </div>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                {clusterOf && <th className={`${headerClass} w-[72px]`}>Cluster</th>}
                <th className={`${headerClass} w-[18%]`}>Household</th>
                <th className={`${headerClass} w-[9%] text-right`}>Members</th>
                {NEED_CATEGORY_ORDER.map((category) => (
                  <th key={category} className={`${headerClass} w-[8%]`} title={NEED_CATEGORY_LABELS[category]}>
                    {NEED_CATEGORY_LABELS[category].split(' ')[0]}
                  </th>
                ))}
                <th className={`${headerClass} w-[9%] text-right`}>Score</th>
                <th className={`${headerClass} w-[10%]`}>Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((household) => {
                const total = totalNeedScore(household.needs)
                return (
                  <tr key={household.id} className="transition-colors hover:bg-gray-50">
                    {clusterOf && (
                      <td className={cellClass}>
                        <span className="flex items-center gap-1.5 tabular-nums">
                          <ClusterSwatch index={clusterOf(household)} />
                          {clusterOf(household) + 1}
                        </span>
                      </td>
                    )}
                    <td className={cellClass}>
                      <span className="block truncate font-medium text-gray-900">
                        {household.familyName} family
                      </span>
                      <span className="block truncate text-[11px] text-gray-400">
                        {household.barangay} · surveyed {formatDateShort(household.surveyedAt)}
                      </span>
                    </td>
                    <td className={`${cellClass} text-right tabular-nums`}>
                      {formatNumber(household.members)}
                    </td>
                    {NEED_CATEGORY_ORDER.map((category) => {
                      const score = household.needs[category]
                      return (
                        <td key={category} className={cellClass}>
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-full max-w-10 overflow-hidden rounded-full bg-gray-100">
                              <span
                                className={cn(
                                  'block h-full rounded-full',
                                  score >= 4
                                    ? 'bg-red-400'
                                    : score >= 2
                                      ? 'bg-amber-400'
                                      : 'bg-gray-300',
                                )}
                                style={{ width: `${(score / NEED_SCORE_MAX) * 100}%` }}
                              />
                            </span>
                            <span className="text-[11px] text-gray-400 tabular-nums">{score}</span>
                          </span>
                        </td>
                      )
                    })}
                    <td className={`${cellClass} text-right tabular-nums`}>
                      <span className="font-semibold text-gray-900">{total}</span>
                      <span className="ml-1 text-[11px] text-gray-400">/ {maxTotal}</span>
                    </td>
                    <td className={cellClass}>
                      <NeedPriorityBadge priority={needPriorityOf(total)} />
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={clusterOf ? 12 : 11}
                    className="py-8 text-center text-[13px] text-gray-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
