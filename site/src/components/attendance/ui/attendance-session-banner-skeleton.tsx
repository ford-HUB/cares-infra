import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Mirrors `AttendanceSessionBanner` — same card height, same hero-plus-bar split, so
 * the swap to the loaded session moves nothing on screen.
 */
export function AttendanceSessionBannerSkeleton() {
  return (
    <Card aria-hidden size="sm" className="mb-4 shrink-0 shadow-sm">
      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3 lg:w-56 lg:shrink-0">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>

        <div className="hidden w-px self-stretch bg-gray-100 lg:block" />

        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex gap-1">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex flex-1 items-center gap-2.5 px-3 py-2">
                <Skeleton className="h-7 w-1 shrink-0 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
