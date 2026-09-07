import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors a deployment card: preview, title row, meta, distribution bar, footer. */
export function DeployedCertificatesGallerySkeleton({ cards }: { cards: number }) {
  return (
    <div
      aria-hidden
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    >
      {Array.from({ length: cards }, (_, index) => (
        <Card key={`deployment-card-skeleton-${index}`} size="sm" className="gap-0 py-0">
          <Skeleton className="h-36 rounded-none" />
          <CardContent className="space-y-2.5 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-36" />
            <div className="space-y-1.5 border-t border-gray-100 pt-2.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3.5 w-16" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </CardContent>
          <CardFooter className="flex items-center gap-1.5 border-t border-gray-100 px-3 py-2">
            <Skeleton className="h-7 flex-1 rounded-lg" />
            <Skeleton className="h-7 flex-1 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
