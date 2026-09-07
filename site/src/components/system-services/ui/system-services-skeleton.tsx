import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface SystemServicesSkeletonProps {
  /** Roughly what the loaded roster will show, so the swap causes no jump. */
  rows: number
}

/** Mirrors the duty banner and the service rows — same heights, same columns. */
export function SystemServicesSkeleton({ rows }: SystemServicesSkeletonProps) {
  return (
    <div aria-hidden>
      <Card size="sm" className="mb-4 shadow-sm">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:w-56 lg:shrink-0">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-28" />
            </div>
          </div>
          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex gap-1">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={`segment-${index}`} className="h-11 flex-1 rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 shadow-sm">
        <ul className="divide-y divide-gray-100">
          {Array.from({ length: rows }, (_, index) => (
            <li
              key={`service-skeleton-${index}`}
              className="flex flex-col gap-4 px-4 py-3.5 lg:flex-row lg:items-center"
            >
              <div className="space-y-1.5 lg:w-[30%]">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-full max-w-xs" />
                <Skeleton className="h-2.5 w-28" />
              </div>
              <div className="space-y-1.5 lg:w-[22%]">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-2.5 w-32" />
              </div>
              <div className="space-y-1.5 lg:w-[20%]">
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-2.5 w-40" />
              </div>
              <div className="hidden lg:block lg:w-[13%]">
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="flex justify-end gap-1.5 lg:w-[15%]">
                <Skeleton className="h-7 w-20 rounded-lg" />
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
