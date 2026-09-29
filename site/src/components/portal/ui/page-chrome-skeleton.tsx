import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading mirrors of the pieces in `page-chrome.tsx`. Each one repeats its counterpart's
 * padding, border, and radius so the swap from skeleton to content moves nothing —
 * when you change a piece in page-chrome, change its mirror here.
 */

/** Mirrors `InlinePageHeader`, keeping the action slot's button-sized block. */
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
