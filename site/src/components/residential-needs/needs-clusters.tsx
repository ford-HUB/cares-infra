import { useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import { formatNumber } from '../../constants/formatting'
import { useNeedsClusters } from '../../hooks/use-needs-clusters'
import type { Household } from '../../types/residential-needs'
import { ClusterCard } from './ui/cluster-card'
import { ClusterScatterChart } from './ui/cluster-scatter-chart'
import { ClustersToolbar } from './ui/clusters-toolbar'
import { HouseholdTable } from './ui/household-table'
import { NeedsClustersSkeleton } from './ui/needs-clusters-skeleton'
import { NeedsModuleTabs } from './ui/needs-module-tabs'

interface NeedsClustersProps {
  households: Household[]
}

/**
 * The Residential Needs child module: the K-Means grouping of the survey, run by
 * decision-service. Cards name each group and its defining need, the scatter shows
 * where the groups sit, and the table lists who is in the selected one.
 */
export function NeedsClusters({ households }: NeedsClustersProps) {
  const { k, result, loading, error, selected, changeK, reseed, toggleSelected } =
    useNeedsClusters(households)

  const visible = useMemo(
    () =>
      selected === null || !result
        ? households
        : households.filter((h) => result.assignments[h.id] === selected),
    [households, result, selected],
  )

  const caption =
    selected === null || !result
      ? `${formatNumber(households.length)} households across ${formatNumber(result?.k ?? k)} clusters`
      : `${formatNumber(visible.length)} of ${formatNumber(households.length)} · cluster ${selected + 1}`

  return (
    <>
      <ClustersToolbar
        k={k}
        result={result}
        loading={loading}
        onKChange={changeK}
        onReseed={reseed}
      />

      <NeedsModuleTabs />

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!result ? (
        !error && <NeedsClustersSkeleton k={k} />
      ) : (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <div className="mb-4 grid grid-cols-1 gap-4 *:min-w-0 md:grid-cols-2 xl:grid-cols-3">
            {result.clusters.map((cluster) => (
              <ClusterCard
                key={cluster.index}
                cluster={cluster}
                total={households.length}
                active={selected === cluster.index}
                onToggle={toggleSelected}
              />
            ))}
          </div>

          <div className="mb-4">
            <ClusterScatterChart households={households} result={result} selected={selected} />
          </div>

          <HouseholdTable
            households={visible}
            caption={caption}
            clusterOf={(h) => result.assignments[h.id]}
          />
        </div>
      )}
    </>
  )
}
