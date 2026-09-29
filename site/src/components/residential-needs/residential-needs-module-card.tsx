import { ArrowRight, HousePlus, Layers } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatNumber, formatPercent } from '../../constants/formatting'
import {
  CLUSTER_K_DEFAULT,
  NEED_CATEGORY_LABELS,
  NEED_CATEGORY_ORDER,
  NEED_PRIORITY_BAR_STYLES,
  NEED_PRIORITY_LABELS,
  NEED_PRIORITY_ORDER,
} from '../../constants/residential-needs'
import {
  ADMIN_NEEDS_CLUSTERS_PATH,
  ADMIN_RESIDENTIAL_NEEDS_PATH,
} from '../../constants/routes'
import { getMockHouseholds, householdPriority } from '../../services/residential-needs-mock'
import type { NeedPriority } from '../../types/residential-needs'

/**
 * The Residential Needs module as it appears on the director's Overview: the one
 * number (households needing urgent help), the priority split, and the two doors
 * into the module. Reads the same mock survey the module screens do.
 */
export function ResidentialNeedsModuleCard() {
  const households = getMockHouseholds()
  const counts = Object.fromEntries(NEED_PRIORITY_ORDER.map((band) => [band, 0])) as Record<
    NeedPriority,
    number
  >
  households.forEach((h) => {
    counts[householdPriority(h)] += 1
  })
  const total = households.length
  const urgent = counts.critical + counts.high
  const share = (value: number) => (total > 0 ? value / total : 0)

  const topNeed = NEED_CATEGORY_ORDER.reduce((top, category) => {
    const tally = (key: typeof category) =>
      households.filter((h) => h.survey.needs.includes(key)).length
    return tally(category) > tally(top) ? category : top
  })

  const linkClass =
    'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none'

  return (
    <Card size="sm" className="shadow-sm">
      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3 lg:w-64 lg:shrink-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--cares-tag-volunteer-bg)] text-[var(--cares-tag-volunteer-text)]">
            <HousePlus className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">
              Residential needs
            </p>
            <p className="flex items-baseline gap-1.5">
              <span className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
                {formatNumber(urgent)}
              </span>
              <span className="text-[13px] text-gray-400 tabular-nums">
                of {formatNumber(total)} urgent
              </span>
            </p>
            <p className="truncate text-[11px] text-gray-400">
              Top need: {NEED_CATEGORY_LABELS[topNeed].toLowerCase()} · mock survey
            </p>
          </div>
        </div>

        <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-gray-100">
            {NEED_PRIORITY_ORDER.map((band) => (
              <div
                key={band}
                className={cn('h-full rounded-full', NEED_PRIORITY_BAR_STYLES[band])}
                style={{ width: `${share(counts[band]) * 100}%` }}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {NEED_PRIORITY_ORDER.map((band) => (
              <li key={band} className="flex items-center gap-1.5 text-[12px] text-gray-500">
                <span className={cn('h-2 w-2 rounded-full', NEED_PRIORITY_BAR_STYLES[band])} />
                {NEED_PRIORITY_LABELS[band]}
                <span className="font-semibold text-gray-900 tabular-nums">{counts[band]}</span>
                <span className="text-gray-400 tabular-nums">{formatPercent(share(counts[band]))}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

        <nav className="flex flex-col gap-0.5 lg:w-52 lg:shrink-0" aria-label="Residential needs modules">
          <Link to={ADMIN_RESIDENTIAL_NEEDS_PATH} className={linkClass}>
            <span className="flex items-center gap-2">
              <HousePlus className="h-4 w-4 text-gray-400" />
              Overview
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </Link>
          <Link to={ADMIN_NEEDS_CLUSTERS_PATH} className={linkClass}>
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-gray-400" />
              Clusters
              <span className="text-[11px] font-normal text-gray-400 tabular-nums">
                {formatNumber(Math.min(CLUSTER_K_DEFAULT, households.length))} groups
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </Link>
        </nav>
      </CardContent>
    </Card>
  )
}
