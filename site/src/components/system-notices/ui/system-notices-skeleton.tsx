import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface SystemNoticesSkeletonProps {
  /** Roughly what the loaded feed shows, so the swap causes no jump. */
  groups: number
  rowsPerGroup: number
}

/** Mirrors the banner and the day-grouped feed underneath it. */
export function SystemNoticesSkeleton({
  groups,
  rowsPerGroup,
}: SystemNoticesSkeletonProps) {
  return (
    <div aria-hidden className="space-y-4">
      <Card size="sm" className="shadow-sm">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:w-64 lg:shrink-0">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-2.5 w-32" />
            </div>
          </div>
          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex gap-1.5">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={`legend-${index}`} className="h-6 w-28 rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {Array.from({ length: groups }, (_, group) => (
        <section key={`notice-group-${group}`}>
          <div className="mb-2 flex items-center gap-3">
            <Skeleton className="h-3 w-24" />
            <span className="h-px flex-1 bg-gray-100" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Card className="gap-0 py-0 shadow-sm">
            <ul className="divide-y divide-gray-100">
              {Array.from({ length: rowsPerGroup }, (_, row) => (
                <li key={`notice-row-${group}-${row}`} className="flex gap-3 px-4 py-3.5">
                  <div className="w-16 shrink-0 space-y-1.5">
                    <Skeleton className="ml-auto h-3 w-14" />
                    <Skeleton className="ml-auto h-2.5 w-10" />
                  </div>
                  <Skeleton className="w-1 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-72" />
                    <Skeleton className="h-3 w-full max-w-2xl" />
                    <Skeleton className="h-3 w-full max-w-md" />
                    <Skeleton className="h-2.5 w-56" />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  )
}
