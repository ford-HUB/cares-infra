import { MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatNumber, formatPercent } from '../../../constants/formatting'
import {
  CLUSTER_SWATCH_STYLES,
  NEED_CATEGORY_LABELS,
  NEED_CATEGORY_ORDER,
  NEED_SCORE_MAX,
} from '../../../constants/residential-needs'
import type { NeedsCluster } from '../../../types/residential-needs'
import { ClusterSwatch } from './cluster-swatch'
import { NeedPriorityBadge } from './need-priority-badge'

interface ClusterCardProps {
  cluster: NeedsCluster
  total: number
  active: boolean
  onToggle: (index: number) => void
}

/**
 * One group's profile: how many households it holds, what they have in common, and
 * the need that defines them. The card is the table's filter for the cluster — click
 * to narrow, click again to clear.
 */
export function ClusterCard({ cluster, total, active, onToggle }: ClusterCardProps) {
  const size = cluster.householdIds.length
  const share = total > 0 ? size / total : 0
  const swatch = CLUSTER_SWATCH_STYLES[cluster.index % CLUSTER_SWATCH_STYLES.length]

  return (
    <Card
      size="sm"
      className={cn(
        // The button carries the padding so the whole card is the hit target.
        'min-w-0 py-0 shadow-sm transition-colors',
        active && 'bg-gray-50 ring-1 ring-[var(--cares-primary)]',
      )}
    >
      <CardContent className="p-0">
        <button
          type="button"
          aria-pressed={active}
          onClick={() => onToggle(cluster.index)}
          className={cn(
            'flex w-full flex-col gap-3 rounded-xl p-4 text-left',
            'focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <ClusterSwatch index={cluster.index} className="h-3 w-3" />
              <div className="min-w-0">
                <p className="text-[11px] tracking-wider text-gray-500 uppercase">
                  Cluster {cluster.index + 1}
                </p>
                <p className="flex items-baseline gap-1.5">
                  <span className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
                    {formatNumber(size)}
                  </span>
                  <span className="text-[12px] text-gray-400 tabular-nums">
                    {formatPercent(share)} of {formatNumber(total)}
                  </span>
                </p>
              </div>
            </div>
            <NeedPriorityBadge priority={cluster.priority} />
          </div>

          <p className="text-[13px] text-gray-700">
            Mostly need{' '}
            <span className="font-medium text-gray-900">
              {NEED_CATEGORY_LABELS[cluster.dominantNeed].toLowerCase()}
            </span>
            {' · '}
            <span className="tabular-nums">{cluster.centroid.members.toFixed(1)}</span> members on
            average
          </p>

          {size > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
              <div className="min-w-0">
                <p className="text-[11px] tracking-wider text-gray-500 uppercase">Concentrated in</p>
                <p className="truncate text-[13px] text-gray-900">
                  <span className="font-medium">Brgy. {cluster.barangay.name}</span>{' '}
                  <span className="text-gray-500 tabular-nums">
                    · {formatNumber(cluster.barangay.count)} of {formatNumber(size)} households (
                    {formatPercent(cluster.barangay.share)})
                  </span>
                </p>
              </div>
            </div>
          )}

          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {NEED_CATEGORY_ORDER.map((category) => {
              const score = cluster.centroid[category]
              return (
                <li key={category} className="min-w-0">
                  <div className="mb-0.5 flex items-baseline justify-between gap-2">
                    <span className="truncate text-[11px] text-gray-500">
                      {NEED_CATEGORY_LABELS[category]}
                    </span>
                    <span className="text-[11px] text-gray-400 tabular-nums">
                      {score.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={cn('h-full rounded-full transition-[width] duration-500', swatch)}
                      style={{ width: `${(score / NEED_SCORE_MAX) * 100}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </button>
      </CardContent>
    </Card>
  )
}
