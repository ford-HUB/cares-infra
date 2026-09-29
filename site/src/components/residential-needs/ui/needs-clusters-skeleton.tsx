import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { NEEDS_CHART_HEIGHT } from '../../../constants/residential-needs'

const rows = (count: number) => Array.from({ length: count }, (_, index) => index)

/** Mirrors `ClusterCard`: swatch + title, the size line, then five need bars. */
function ClusterCardSkeleton() {
  return (
    <Card aria-hidden size="sm" className="shadow-sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-40" />
        <div className="space-y-2">
          {rows(5).map((row) => (
            <Skeleton key={row} className="h-2.5 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * The Clusters screen while the first grouping is on its way back from
 * decision-service: the cards, the scatter, and the table's header rows.
 */
export function NeedsClustersSkeleton({ k }: { k: number }) {
  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-4 *:min-w-0 md:grid-cols-2 xl:grid-cols-3">
        {rows(k).map((row) => (
          <ClusterCardSkeleton key={row} />
        ))}
      </div>
      <Card aria-hidden size="sm" className="mb-4 shadow-sm">
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className={`${NEEDS_CHART_HEIGHT} w-full rounded`} />
        </CardContent>
      </Card>
      <Card aria-hidden size="sm" className="shadow-sm">
        <CardContent className="space-y-3">
          {rows(6).map((row) => (
            <Skeleton key={row} className="h-4 w-full" />
          ))}
        </CardContent>
      </Card>
    </>
  )
}
