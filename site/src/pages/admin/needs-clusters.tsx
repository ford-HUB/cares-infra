import { ContentShell } from '../../components/portal/ui/content-shell'
import { NeedsClusters } from '../../components/residential-needs/needs-clusters'
import { NeedsClustersSkeleton } from '../../components/residential-needs/ui/needs-clusters-skeleton'
import { NeedsDataGate } from '../../components/residential-needs/ui/needs-data-gate'
import { CLUSTER_K_DEFAULT } from '../../constants/residential-needs'
import { useResidentialNeeds } from '../../hooks/use-residential-needs'

/** Residential Needs › Clusters — the K-Means grouping of the submitted surveys. */
export function NeedsClustersPage() {
  const { households, loaded, error, reload } = useResidentialNeeds()
  return (
    <ContentShell>
      <NeedsDataGate
        loaded={loaded}
        error={error}
        empty={households.length === 0}
        onRetry={reload}
        skeleton={<NeedsClustersSkeleton k={CLUSTER_K_DEFAULT} />}
      >
        <NeedsClusters households={households} />
      </NeedsDataGate>
    </ContentShell>
  )
}
