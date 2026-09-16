import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  STATISTICS_CHART_HEIGHT,
  STATISTICS_SMALL_CHART_HEIGHT,
} from '../../constants/department-statistics'

const rows = (count: number) => Array.from({ length: count }, (_, index) => index)

/** Mirrors `StatisticTile`: chip, label, value, delta line, sparkline. */
function StatisticTileSkeleton() {
  return (
    <Card aria-hidden size="sm" className="shadow-sm">
      <CardContent className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-10 w-20 self-center rounded" />
      </CardContent>
    </Card>
  )
}

/** Mirrors `ChartCard`: title, description, then the plot at the chart's height. */
function ChartCardSkeleton({ height }: { height: string }) {
  return (
    <Card aria-hidden size="sm" className="shadow-sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className={`w-full rounded-lg ${height}`} />
      </CardContent>
    </Card>
  )
}

export function DepartmentStatisticsSkeleton() {
  return (
    <div aria-busy>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-64 rounded-lg" />
          <Skeleton className="h-7 w-44 rounded-lg" />
          <Skeleton className="h-7 w-24 rounded-lg" />
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {rows(4).map((index) => (
          <StatisticTileSkeleton key={index} />
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <ChartCardSkeleton height={STATISTICS_CHART_HEIGHT} />
        </div>
        <div className="min-w-0 lg:col-span-2">
          <ChartCardSkeleton height={STATISTICS_CHART_HEIGHT} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {rows(3).map((index) => (
          <ChartCardSkeleton key={index} height={STATISTICS_SMALL_CHART_HEIGHT} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <ChartCardSkeleton height="h-72" />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <ChartCardSkeleton height={STATISTICS_SMALL_CHART_HEIGHT} />
          <ChartCardSkeleton height="h-40" />
        </div>
      </div>
    </div>
  )
}
