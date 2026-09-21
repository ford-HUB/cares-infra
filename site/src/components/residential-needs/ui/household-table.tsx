import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDateShort, formatNumber } from '../../../constants/formatting'
import {
  COMMUNITY_PROBLEM_LABELS,
  NEED_BARRIER_LABELS,
  NEED_CATEGORY_LABELS,
  NEED_SERIOUSNESS_LABELS,
  NEED_SERIOUSNESS_MAX,
  NEEDS_SURVEY_SOURCE_LABEL,
} from '../../../constants/residential-needs'
import { householdPriority } from '../../../services/residential-needs-mock'
import type { Household, HouseholdSurvey } from '../../../types/residential-needs'
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
const cellClass = 'px-3 py-2.5 align-top text-[13px] text-gray-700'
const chipClass =
  'inline-block max-w-full truncate rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700'

/** Q1 chips — "Other" carries what the beneficiary typed. */
function needLabels(survey: HouseholdSurvey): string[] {
  return survey.needs.map((need) =>
    need === 'other' && survey.otherNeed ? `Other — ${survey.otherNeed}` : NEED_CATEGORY_LABELS[need],
  )
}

/** Q3 chips — "Other" carries what the beneficiary typed. */
function barrierLabels(survey: HouseholdSurvey): string[] {
  return survey.barriers.map((barrier) =>
    barrier === 'other' && survey.otherBarrier
      ? `Other — ${survey.otherBarrier}`
      : NEED_BARRIER_LABELS[barrier],
  )
}

/** Q4 — "Other" carries what the beneficiary typed. */
function communityProblemLabel(survey: HouseholdSurvey): string {
  return survey.communityProblem === 'other' && survey.otherCommunityProblem
    ? `Other — ${survey.otherCommunityProblem}`
    : COMMUNITY_PROBLEM_LABELS[survey.communityProblem]
}

/**
 * The survey rows themselves — the content the summary blocks above describe. One
 * column per question so a row reads the way the beneficiary answered it: what they
 * need, how serious it is, what stands in the way, what they see around them, and
 * anything else they wrote.
 */
export function HouseholdTable({
  households,
  caption,
  clusterOf,
  emptyMessage = 'No households match this filter.',
}: HouseholdTableProps) {
  const rows = [...households].sort(
    (a, b) =>
      b.survey.seriousness - a.survey.seriousness || b.survey.needs.length - a.survey.needs.length,
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
          <table className="w-full min-w-[1040px] table-fixed border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                {clusterOf && <th className={`${headerClass} w-[72px]`}>Cluster</th>}
                <th className={`${headerClass} w-[15%]`}>Household</th>
                <th className={`${headerClass} w-[7%] text-right`}>Members</th>
                <th className={`${headerClass} w-[17%]`}>Needs help with</th>
                <th className={`${headerClass} w-[13%]`}>Seriousness</th>
                <th className={`${headerClass} w-[18%]`}>Difficulties</th>
                <th className={`${headerClass} w-[11%]`}>Community problem</th>
                <th className={`${headerClass} w-[12%]`}>Other concern</th>
                <th className={`${headerClass} w-[8%]`}>Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((household) => {
                const { survey } = household
                const needs = needLabels(survey)
                const barriers = barrierLabels(survey)
                const problem = communityProblemLabel(survey)
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
                    <td className={cellClass}>
                      <span className="flex flex-wrap gap-1">
                        {needs.map((label) => (
                          <span key={label} className={chipClass} title={label}>
                            {label}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className={cellClass}>
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-full max-w-10 shrink-0 overflow-hidden rounded-full bg-gray-100">
                          <span
                            className={cn(
                              'block h-full rounded-full',
                              survey.seriousness >= 4
                                ? 'bg-red-400'
                                : survey.seriousness >= 3
                                  ? 'bg-amber-400'
                                  : 'bg-gray-300',
                            )}
                            style={{ width: `${(survey.seriousness / NEED_SERIOUSNESS_MAX) * 100}%` }}
                          />
                        </span>
                        <span className="truncate text-[12px] text-gray-600">
                          {NEED_SERIOUSNESS_LABELS[survey.seriousness]}
                        </span>
                      </span>
                    </td>
                    <td className={cellClass}>
                      <span className="flex flex-wrap gap-1">
                        {barriers.map((label) => (
                          <span
                            key={label}
                            className={cn(chipClass, label === NEED_BARRIER_LABELS.none && 'text-gray-400')}
                            title={label}
                          >
                            {label}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className={cellClass}>
                      <span className="block truncate" title={problem}>
                        {problem}
                      </span>
                    </td>
                    <td className={cellClass}>
                      {survey.concern ? (
                        <span className="line-clamp-2 text-[12px] text-gray-600" title={survey.concern}>
                          {survey.concern}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className={cellClass}>
                      <NeedPriorityBadge priority={householdPriority(household)} />
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={clusterOf ? 9 : 8}
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
