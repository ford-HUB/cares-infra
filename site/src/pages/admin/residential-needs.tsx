import { ContentShell } from '../../components/portal/ui/content-shell'
import { ResidentialNeedsOverview } from '../../components/residential-needs/residential-needs-overview'
import { NeedsDataGate } from '../../components/residential-needs/ui/needs-data-gate'
import { ResidentialNeedsSkeleton } from '../../components/residential-needs/ui/residential-needs-skeleton'
import { useResidentialNeeds } from '../../hooks/use-residential-needs'

/** The director's Residential Needs module — survey overview, with Clusters as its child. */
export function ResidentialNeedsPage() {
  const { households, loaded, error, reload } = useResidentialNeeds()
  return (
    <ContentShell>
      <NeedsDataGate
        loaded={loaded}
        error={error}
        empty={households.length === 0}
        onRetry={reload}
        skeleton={<ResidentialNeedsSkeleton />}
      >
        <ResidentialNeedsOverview households={households} />
      </NeedsDataGate>
    </ContentShell>
  )
}
