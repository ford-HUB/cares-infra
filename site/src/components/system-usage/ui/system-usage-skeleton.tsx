import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SYSTEM_USAGE_SKELETON_ROWS } from '../../../constants/system-usage'

function PanelSkeleton({ chartClass }: { chartClass: string }) {
  return (
    <Card className="gap-0 shadow-sm">
      <CardContent className="flex flex-col gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className={`w-full ${chartClass}`} />
      </CardContent>
    </Card>
  )
}

/** Mirrors SystemUsage — summary, CPU chart, three small charts, table and events. */
export function SystemUsageSkeleton() {
  return (
    <div aria-hidden>
      <Card size="sm" className="mb-4 shadow-sm">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:min-w-[15rem]">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardContent>
      </Card>

      <div className="mb-4">
        <PanelSkeleton chartClass="h-72" />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <PanelSkeleton key={i} chartClass="h-32" />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="gap-0 shadow-sm xl:col-span-2">
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-3 w-24" />
            {Array.from({ length: SYSTEM_USAGE_SKELETON_ROWS }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
        <PanelSkeleton chartClass="h-72" />
      </div>
    </div>
  )
}
