import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors the banner and the six group cards — same heights, same grid. */
export function SystemDiagnosticsSkeleton() {
  return (
    <div aria-hidden>
      <Card size="sm" className="mb-4 shadow-sm">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:w-72 lg:shrink-0">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-36" />
            </div>
          </div>
          <div className="hidden w-px self-stretch bg-gray-100 lg:block" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
          <Skeleton className="h-8 w-28 rounded-md" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={`group-${index}`} size="sm" className="shadow-sm">
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-48" />
              </div>
              {Array.from({ length: index % 2 === 0 ? 2 : 4 }, (_, row) => (
                <div key={`row-${row}`} className="flex items-start gap-2.5">
                  <Skeleton className="mt-1 h-2 w-2 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-2/5" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
