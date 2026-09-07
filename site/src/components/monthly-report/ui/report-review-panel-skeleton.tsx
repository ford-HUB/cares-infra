import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors `ReportReviewPanel` — same header, submitter strip, metrics row and lists. */
export function ReportReviewPanelSkeleton() {
  return (
    <div
      aria-hidden
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white ring-1 ring-gray-200"
    >
      <div className="shrink-0 border-b border-gray-100 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-4 w-10 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      <div className="flex-1 space-y-5 px-5 py-4">
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-2 rounded-lg bg-gray-50 px-3 py-2.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5"
            >
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-56" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
