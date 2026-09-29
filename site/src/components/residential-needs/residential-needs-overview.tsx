import { FileText, Layers } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatNumber } from '../../constants/formatting'
import {
  COMMUNITY_PROBLEM_LABELS,
  COMMUNITY_PROBLEM_ORDER,
  NEED_BARRIER_LABELS,
  NEED_BARRIER_ORDER,
  NEED_CATEGORY_LABELS,
  NEED_CATEGORY_ORDER,
  NEED_PRIORITY_LABELS,
  NEED_PRIORITY_ORDER,
  NEEDS_FILTER_ALL,
} from '../../constants/residential-needs'
import { ADMIN_NEEDS_CLUSTERS_PATH } from '../../constants/routes'
import {
  householdPriority,
  RESIDENTIAL_NEEDS_BARANGAYS,
} from '../../services/residential-needs-mock'
import type { Household, NeedPriority } from '../../types/residential-needs'
import { exportResidentialNeedsPdf } from '../../utils/export-residential-needs-pdf'
import { HouseholdTable } from './ui/household-table'
import { NeedsByBarangayChart } from './ui/needs-by-barangay-chart'
import { NeedsModuleTabs } from './ui/needs-module-tabs'
import { NeedsPriorityBanner, type PriorityFilter } from './ui/needs-priority-banner'
import { SurveyAnswerChart } from './ui/survey-answer-chart'

interface ResidentialNeedsOverviewProps {
  households: Household[]
}

/**
 * The survey as a whole: how many households are urgent, what they lack, where they
 * are, then the rows. The banner's bands and the barangay picker both narrow the table.
 */
export function ResidentialNeedsOverview({ households }: ResidentialNeedsOverviewProps) {
  const [priority, setPriority] = useState<PriorityFilter>(NEEDS_FILTER_ALL)
  const [barangay, setBarangay] = useState<string>(NEEDS_FILTER_ALL)

  const scoped = useMemo(
    () =>
      barangay === NEEDS_FILTER_ALL
        ? households
        : households.filter((h) => h.barangay === barangay),
    [households, barangay],
  )

  const counts = useMemo(() => {
    const tally = Object.fromEntries(NEED_PRIORITY_ORDER.map((band) => [band, 0])) as Record<
      NeedPriority,
      number
    >
    scoped.forEach((h) => {
      tally[householdPriority(h)] += 1
    })
    return tally
  }, [scoped])

  const visible = useMemo(
    () =>
      priority === NEEDS_FILTER_ALL
        ? scoped
        : scoped.filter((h) => householdPriority(h) === priority),
    [scoped, priority],
  )

  // One row per answer choice for the three multiple-choice questions, over the
  // barangay-scoped rows so the charts and the banner describe the same households.
  const needRows = useMemo(
    () =>
      NEED_CATEGORY_ORDER.map((need) => ({
        label: NEED_CATEGORY_LABELS[need],
        count: scoped.filter((h) => h.survey.needs.includes(need)).length,
      })),
    [scoped],
  )
  const barrierRows = useMemo(
    () =>
      NEED_BARRIER_ORDER.map((barrier) => ({
        label: NEED_BARRIER_LABELS[barrier],
        count: scoped.filter((h) => h.survey.barriers.includes(barrier)).length,
      })),
    [scoped],
  )
  const problemRows = useMemo(
    () =>
      COMMUNITY_PROBLEM_ORDER.map((problem) => ({
        label: COMMUNITY_PROBLEM_LABELS[problem],
        count: scoped.filter((h) => h.survey.communityProblem === problem).length,
      })),
    [scoped],
  )

  const exportPdf = useCallback(
    () => exportResidentialNeedsPdf(scoped, visible, { barangay, priority }),
    [scoped, visible, barangay, priority],
  )

  const caption = [
    `${formatNumber(visible.length)} of ${formatNumber(scoped.length)}`,
    priority !== NEEDS_FILTER_ALL && NEED_PRIORITY_LABELS[priority].toLowerCase(),
    barangay !== NEEDS_FILTER_ALL && `in ${barangay}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900">Residential Needs</h1>
          <p className="text-sm text-gray-600">
            Household survey across partner barangays — what families lack and how urgently.
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            Mock survey data — not connected to the server.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={barangay} onValueChange={setBarangay}>
            <SelectTrigger size="sm" className="w-44" aria-label="Barangay">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NEEDS_FILTER_ALL}>All barangays</SelectItem>
              {RESIDENTIAL_NEEDS_BARANGAYS.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={exportPdf}>
            <FileText />
            Export PDF
          </Button>
          <Button asChild size="sm">
            <Link to={ADMIN_NEEDS_CLUSTERS_PATH}>
              <Layers />
              Open Clusters
            </Link>
          </Button>
        </div>
      </div>

      <NeedsModuleTabs />

      <NeedsPriorityBanner
        total={scoped.length}
        counts={counts}
        filter={priority}
        onFilterChange={setPriority}
      />

      <div className="mb-4 grid grid-cols-1 gap-4 *:min-w-0 xl:grid-cols-2">
        <SurveyAnswerChart
          title="What households need help with"
          description="Households that selected each need — one household can select several."
          rows={needRows}
          total={scoped.length}
        />
        <NeedsByBarangayChart households={scoped} />
        <SurveyAnswerChart
          title="What makes needs hard to meet"
          description="Difficulties households named — one household can name several."
          rows={barrierRows}
          total={scoped.length}
        />
        <SurveyAnswerChart
          title="Problems seen in the community"
          description="The one problem each household most commonly observes."
          rows={problemRows}
          total={scoped.length}
        />
      </div>

      <HouseholdTable households={visible} caption={caption} />
    </>
  )
}
