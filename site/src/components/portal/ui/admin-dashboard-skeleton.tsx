import {
  GradientMetricTileSkeleton,
  InlinePageHeaderSkeleton,
  MetricTileSkeleton,
  SectionCardSkeleton,
  StatCardSkeleton,
} from './page-chrome-skeleton'

interface AdminDashboardSkeletonProps {
  /**
   * The role is known from the auth store before the overview request resolves, so the
   * skeleton can commit to the right layout instead of guessing one and reflowing.
   */
  isCoordinator: boolean
}

const STAT_CARDS = 4
const METRIC_TILES = 5
const GRADIENT_TILES = 4

const tile = (count: number) => Array.from({ length: count }, (_, index) => index)

export function AdminDashboardSkeleton({ isCoordinator }: AdminDashboardSkeletonProps) {
  return (
    <div aria-busy>
      <InlinePageHeaderSkeleton />

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {tile(STAT_CARDS).map((index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>

      <div className="mb-8">
        <SectionCardSkeleton
          title={isCoordinator ? 'Department Metrics' : 'System Metrics'}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {tile(METRIC_TILES).map((index) => (
              <MetricTileSkeleton key={index} />
            ))}
          </div>
        </SectionCardSkeleton>
      </div>

      {/* The coordinator dashboard stops after its metrics section. */}
      {!isCoordinator && (
        <div className="mb-6">
          <SectionCardSkeleton title="Recent Activity (Last 7 Days)">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {tile(GRADIENT_TILES).map((index) => (
                <GradientMetricTileSkeleton key={index} />
              ))}
            </div>
          </SectionCardSkeleton>
        </div>
      )}
    </div>
  )
}
