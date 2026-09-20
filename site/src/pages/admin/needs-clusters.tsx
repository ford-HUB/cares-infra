import { ContentShell } from '../../components/portal/ui/content-shell'
import { NeedsClusters } from '../../components/residential-needs/needs-clusters'
import { getMockHouseholds } from '../../services/residential-needs-mock'

/** Residential Needs › Clusters — the mock k-means grouping of the survey. */
export function NeedsClustersPage() {
  return (
    <ContentShell>
      <NeedsClusters households={getMockHouseholds()} />
    </ContentShell>
  )
}
