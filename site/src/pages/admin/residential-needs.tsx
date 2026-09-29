import { ContentShell } from '../../components/portal/ui/content-shell'
import { ResidentialNeedsOverview } from '../../components/residential-needs/residential-needs-overview'
import { getMockHouseholds } from '../../services/residential-needs-mock'

/** The director's Residential Needs module — survey overview, with Clusters as its child. */
export function ResidentialNeedsPage() {
  return (
    <ContentShell>
      <ResidentialNeedsOverview households={getMockHouseholds()} />
    </ContentShell>
  )
}
