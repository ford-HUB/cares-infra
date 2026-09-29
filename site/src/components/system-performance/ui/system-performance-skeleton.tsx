import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ENDPOINT_ROWS } from '../../../constants/system-performance'

/** Mirrors the banner, the tile row, both charts, and the two tables below them. */
export function SystemPerformanceSkeleton() {
  return (
    <div aria-hidden>
      <Card size="sm" className="mb-4 shadow-sm">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:w-64 lg:shrink-0">
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
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={`band-${index}`} className="h-11 flex-1 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />
          <div className="space-y-1.5 lg:w-44 lg:shrink-0">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-28" />
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={`tile-${index}`} size="sm" className="shadow-sm">
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-4 gap-0 shadow-sm">
        <CardContent className="space-y-4">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-3 w-64" />
        </CardContent>
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={`panel-${index}`} className="gap-0 shadow-sm">
            <CardContent className="space-y-4">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-4 gap-0 shadow-sm">
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-96 max-w-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 2 }, (_, index) => (
              <Skeleton key={`finding-${index}`} className="h-14 w-full rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 border-t border-gray-100 pt-5 lg:grid-cols-2">
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <Skeleton className="h-4 w-48" />
        </div>
        <ul className="divide-y divide-gray-100">
          {Array.from({ length: ENDPOINT_ROWS }, (_, index) => (
            <li
              key={`endpoint-${index}`}
              className="flex items-center gap-4 px-4 py-2.5"
            >
              <Skeleton className="h-3.5 w-[28%]" />
              <Skeleton className="h-3.5 w-[8%]" />
              <Skeleton className="h-3.5 w-[8%]" />
              <Skeleton className="h-1.5 w-[26%] rounded-full" />
              <Skeleton className="h-3.5 w-[8%]" />
              <Skeleton className="h-6 w-[14%]" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
