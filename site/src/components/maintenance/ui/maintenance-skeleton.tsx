import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface MaintenanceSkeletonProps {
  /** Roughly what the loaded board shows, so the swap causes no jump. */
  windowRows: number
  announcementRows: number
}

/** Mirrors the status banner, the window board, and the announcement board. */
export function MaintenanceSkeleton({
  windowRows,
  announcementRows,
}: MaintenanceSkeletonProps) {
  return (
    <div aria-hidden className="space-y-4">
      <Card size="sm" className="shadow-sm">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:w-64 lg:shrink-0">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-2.5 w-28" />
            </div>
          </div>
          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex gap-1">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={`surface-${index}`} className="h-11 flex-1 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />
          <div className="space-y-1.5 lg:w-44">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 shadow-sm">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-72" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {Array.from({ length: windowRows }, (_, index) => (
            <li
              key={`window-skeleton-${index}`}
              className="flex flex-col gap-4 px-4 py-3.5 lg:flex-row lg:items-center"
            >
              <div className="space-y-1.5 lg:w-[30%]">
                <Skeleton className="h-3.5 w-56" />
                <Skeleton className="h-3 w-full max-w-xs" />
                <Skeleton className="h-2.5 w-32" />
              </div>
              <div className="space-y-1.5 lg:w-[24%]">
                <Skeleton className="h-3.5 w-44" />
                <Skeleton className="h-2.5 w-28" />
              </div>
              <div className="space-y-1.5 lg:w-[22%]">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-2.5 w-36" />
              </div>
              <div className="flex justify-end gap-1.5 lg:w-[24%]">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="gap-0 py-0 shadow-sm">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-8 w-64 rounded-lg" />
        </div>
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {Array.from({ length: announcementRows }, (_, index) => (
            <li
              key={`announcement-skeleton-${index}`}
              className="flex gap-3 px-4 py-3.5"
            >
              <Skeleton className="w-1 rounded-full" />
              <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
                <div className="space-y-1.5 lg:w-[44%]">
                  <Skeleton className="h-3.5 w-64" />
                  <Skeleton className="h-3 w-full max-w-md" />
                  <Skeleton className="h-2.5 w-40" />
                </div>
                <div className="space-y-1.5 lg:w-[22%]">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
                <div className="space-y-1.5 lg:w-[16%]">
                  <Skeleton className="h-4 w-20 rounded-full" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <div className="flex justify-end gap-1.5 lg:w-[18%]">
                  <Skeleton className="h-8 w-24 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
