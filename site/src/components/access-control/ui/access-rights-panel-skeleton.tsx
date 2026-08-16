import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors three permission-module sections — the panel's typical first screenful. */
export function AccessRightsPanelSkeleton() {
  return (
    <div aria-hidden className="space-y-3">
      <Skeleton className="h-12 w-full rounded-lg" />

      {Array.from({ length: 3 }, (_, section) => (
        <div key={section} className="rounded-lg border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-8" />
          </div>

          <div className="divide-y divide-gray-100">
            {Array.from({ length: 3 }, (_, row) => (
              <div key={row} className="flex items-start gap-3 px-3 py-2.5">
                <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-full max-w-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
