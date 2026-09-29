import { Skeleton } from '@/components/ui/skeleton'

interface SupportTicketsListSkeletonProps {
  /** Roughly what the loaded list will show, so the swap causes no jump. */
  rows: number
}

/** Mirrors a list row: number + status on one line, type + reporter on the next. */
export function SupportTicketsListSkeleton({ rows }: SupportTicketsListSkeletonProps) {
  return (
    <ul aria-hidden className="divide-y divide-gray-100">
      {Array.from({ length: rows }, (_, index) => (
        <li key={`ticket-skeleton-${index}`} className="space-y-1 px-3 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-3 w-20" />
          </div>
        </li>
      ))}
    </ul>
  )
}
