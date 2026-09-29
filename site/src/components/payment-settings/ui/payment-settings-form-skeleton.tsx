import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

/** The four channel cards the form renders. */
const METHOD_CARDS = 4

/**
 * Mirrors the form's summary card and its grid of channel cards — same heights, same
 * columns — so the swap to the loaded settings causes no jump.
 */
export function PaymentSettingsFormSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Card size="sm" className="shadow-sm">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 lg:w-64 lg:shrink-0">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-5 w-44" />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: METHOD_CARDS }, (_, card) => (
          <Card key={card} size="sm" className="shadow-sm">
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
              <div className="grid gap-3 border-t border-gray-100 pt-3 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, field) => (
                  <div key={field} className="space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
    </div>
  )
}
