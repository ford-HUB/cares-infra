import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors of the `page-chrome.tsx` pieces; keep their padding, border and radius in sync. */

export function InlinePageHeaderSkeleton() {
  return (
    <div aria-hidden className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-10 w-28 rounded-lg" />
    </div>
  )
}
