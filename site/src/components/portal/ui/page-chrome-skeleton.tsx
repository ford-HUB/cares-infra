import { Skeleton } from '@/components/ui/skeleton'
import type { ReactNode } from 'react'

/**
 * Loading mirrors of the tiles in `page-chrome.tsx`. Each one repeats its counterpart's
 * padding, border, and radius so the swap from skeleton to content moves nothing —
 * when you change a tile in page-chrome, change its mirror here.
 */

/** Mirrors `StatCard`. */
export function StatCardSkeleton() {
  return (
    <div
      aria-hidden
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <Skeleton className="h-12 w-12 rounded-lg" />
      </div>
    </div>
  )
}

/** Mirrors `MetricTile`. */
export function MetricTileSkeleton() {
  return (
    <div aria-hidden className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-2 flex items-center space-x-3">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-7 w-16" />
      <Skeleton className="mt-1 h-3 w-24" />
    </div>
  )
}

/** Mirrors `GradientMetricTile`. */
export function GradientMetricTileSkeleton() {
  return (
    <div aria-hidden className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <Skeleton className="mb-1 h-4 w-28" />
      <Skeleton className="h-7 w-16" />
    </div>
  )
}

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

/** Mirrors `SectionCard`; the title is real text since it is known before the fetch. */
export function SectionCardSkeleton({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <Skeleton aria-hidden className="h-5 w-5 rounded" />
      </div>
      {children}
    </div>
  )
}
