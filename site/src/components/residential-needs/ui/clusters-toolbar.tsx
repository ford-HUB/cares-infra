import { Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatNumber } from '../../../constants/formatting'
import {
  CLUSTER_K_MAX,
  CLUSTER_K_MIN,
  NEEDS_SURVEY_SOURCE_LABEL,
} from '../../../constants/residential-needs'
import type { NeedsClusteringResult } from '../../../types/residential-needs'

interface ClustersToolbarProps {
  k: number
  result: NeedsClusteringResult
  onKChange: (k: number) => void
  onReseed: () => void
}

const K_OPTIONS = Array.from(
  { length: CLUSTER_K_MAX - CLUSTER_K_MIN + 1 },
  (_, i) => CLUSTER_K_MIN + i,
)

/**
 * Title plus the two knobs the model exposes — how many groups to find, and a fresh
 * random start — with the run's fit beside them so a director can tell whether the
 * grouping is tight or an artefact of where it started.
 */
export function ClustersToolbar({ k, result, onKChange, onReseed }: ClustersToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-gray-900">Needs Clusters</h1>
        <p className="text-sm text-gray-600">
          Households grouped by similar need profile from the {NEEDS_SURVEY_SOURCE_LABEL},
          each pinned to the barangay it concentrates in — so one programme can serve each
          group where it lives.
        </p>
        <p className="mt-0.5 text-[11px] text-gray-400 tabular-nums">
          Mock k-means · {result.converged ? 'converged' : 'cut off'} after{' '}
          {formatNumber(result.iterations)} iteration{result.iterations === 1 ? '' : 's'} · inertia{' '}
          {result.inertia.toFixed(1)} · seed {result.seed}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] tracking-wider text-gray-500 uppercase">Groups</span>
        <ToggleGroup
          type="single"
          value={String(k)}
          onValueChange={(value) => value && onKChange(Number(value))}
          variant="outline"
          size="sm"
          aria-label="Number of clusters"
        >
          {K_OPTIONS.map((option) => (
            <ToggleGroupItem key={option} value={String(option)} className="px-3 tabular-nums">
              {option}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button type="button" variant="outline" size="sm" onClick={onReseed}>
          <Shuffle />
          Re-run
        </Button>
      </div>
    </div>
  )
}
