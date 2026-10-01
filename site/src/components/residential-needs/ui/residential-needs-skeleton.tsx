import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { NEEDS_CHART_HEIGHT } from '../../../constants/residential-needs'

const rows = (count: number) => Array.from({ length: count }, (_, index) => index)

/**
 * The Residential Needs overview while the survey loads: the heading, the
 * priority banner, two chart cards, and the table's first rows.
 */
export function ResidentialNeedsSkeleton() {
  return (
    <div aria-busy aria-label="Loading residential needs" className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rows(2).map((row) => (
          <Card key={row} aria-hidden size="sm" className="shadow-sm">
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className={`${NEEDS_CHART_HEIGHT} w-full`} />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card aria-hidden size="sm" className="shadow-sm">
        <CardContent className="space-y-2">
          {rows(6).map((row) => (
            <Skeleton key={row} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
