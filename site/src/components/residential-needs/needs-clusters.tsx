import { useMemo } from 'react'
import { formatNumber } from '../../constants/formatting'
import { useNeedsClusters } from '../../hooks/use-needs-clusters'
import type { Household } from '../../types/residential-needs'
import { ClusterCard } from './ui/cluster-card'
import { ClusterScatterChart } from './ui/cluster-scatter-chart'
import { ClustersToolbar } from './ui/clusters-toolbar'
import { HouseholdTable } from './ui/household-table'
import { NeedsModuleTabs } from './ui/needs-module-tabs'

interface NeedsClustersProps {
  households: Household[]
}

/**
 * The Residential Needs child module: the mock k-means run over the survey. Cards
 * name each group and its defining need, the scatter shows where the groups sit, and
 * the table lists who is in the selected one.
 */
export function NeedsClusters({ households }: NeedsClustersProps) {
  const { k, result, selected, changeK, reseed, toggleSelected } =
    useNeedsClusters(households)

  const visible = useMemo(
    () =>
      selected === null
        ? households
        : households.filter((h) => result.assignments[h.id] === selected),
    [households, result, selected],
  )

  const caption =
    selected === null
      ? `${formatNumber(households.length)} households across ${formatNumber(result.k)} clusters`
      : `${formatNumber(visible.length)} of ${formatNumber(households.length)} · cluster ${selected + 1}`

  return (
    <>
      <ClustersToolbar k={k} result={result} onKChange={changeK} onReseed={reseed} />

      <NeedsModuleTabs />

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
    </>
  )
}
