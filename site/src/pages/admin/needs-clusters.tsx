import { ContentShell } from '../../components/portal/ui/content-shell'
import { NeedsClusters } from '../../components/residential-needs/needs-clusters'
import { getMockHouseholds } from '../../services/residential-needs-mock'

/** Residential Needs › Clusters — the K-Means grouping of the (still mock) survey rows. */
export function NeedsClustersPage() {
  return (
    <ContentShell>
      <NeedsClusters households={getMockHouseholds()} />
    </ContentShell>
  )
}
