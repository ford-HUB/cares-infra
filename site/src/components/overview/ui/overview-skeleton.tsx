import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { InlinePageHeaderSkeleton } from '../../portal/ui/page-chrome-skeleton'
import {
  OVERVIEW_BAR_HEIGHT,
  OVERVIEW_DONUT_HEIGHT,
  OVERVIEW_GAUGE_HEIGHT,
  OVERVIEW_SEGMENT_HEIGHT,
} from '../../../constants/overview'

interface OverviewSkeletonProps {
  /**
   * The role is known from the auth store before the overview request resolves, so the
   * skeleton can commit to the right layout instead of guessing one and reflowing.
   * The coordinator's gauge row holds two cards where the system overview holds three.
   */
  isCoordinator: boolean
}

interface ChartCardSkeletonProps {
  /** Mirrors the plot area of the card it stands in for — same height class. */
  bodyHeight: string
  legendRows?: number
}

/** Mirrors `ChartCard`: title, one description line, the plot, then the legend. */
function ChartCardSkeleton({ bodyHeight, legendRows = 0 }: ChartCardSkeletonProps) {
  return (
    <Card size="sm" aria-hidden className="min-w-0 shadow-sm">
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-44 max-w-full" />
          </div>
          <div className="space-y-1.5 text-right">
            <Skeleton className="ml-auto h-5 w-12" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
        </div>
        <Skeleton className={`w-full ${bodyHeight}`} />
        {legendRows > 0 && (
          <div className="space-y-1.5">
            {Array.from({ length: legendRows }, (_, index) => (
              <Skeleton key={index} className="h-3.5 w-full" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const tile = (count: number) => Array.from({ length: count }, (_, index) => index)

export function OverviewSkeleton({ isCoordinator }: OverviewSkeletonProps) {
  return (
    <div aria-busy>
      <InlinePageHeaderSkeleton />

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {!isCoordinator && (
          <ChartCardSkeleton bodyHeight={OVERVIEW_DONUT_HEIGHT} legendRows={2} />
        )}
        {tile(isCoordinator ? 3 : 2).map((index) => (
          <ChartCardSkeleton
            key={index}
            bodyHeight={OVERVIEW_SEGMENT_HEIGHT}
            legendRows={index === 0 ? 4 : 3}
          />
        ))}
      </div>

      <div
        className={`mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 ${
          isCoordinator ? '' : 'lg:grid-cols-3'
        }`}
      >
        {tile(isCoordinator ? 2 : 3).map((index) => (
          <ChartCardSkeleton key={index} bodyHeight={OVERVIEW_GAUGE_HEIGHT} />
        ))}
      </div>

      <ChartCardSkeleton bodyHeight={OVERVIEW_BAR_HEIGHT} />
    </div>
  )
}
