import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors `ReportSubmissionList` rows — same four lines, same heights. */
export function ReportSubmissionListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex flex-col gap-1.5 border-b border-gray-100 px-4 py-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-10 rounded-md" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <Skeleton className="h-3.5 w-52" />
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}
