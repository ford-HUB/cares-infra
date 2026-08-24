import { Skeleton } from '@/components/ui/skeleton'
import { REQUEST_SKELETON_ROWS } from '../../../constants/beneficiary-requests'

export function UserRequestTimelineSkeleton({
  rows = REQUEST_SKELETON_ROWS,
}: {
  rows?: number
}) {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-3 w-24" />

      <ol className="space-y-3 border-l-2 border-gray-200">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="relative pl-10">
            <span className="absolute top-5 left-[13px] h-2.5 w-2.5 rounded-full bg-gray-200 ring-4 ring-gray-50" />
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="ml-auto h-4 w-14" />
              </div>
              <Skeleton className="mt-3 h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-64" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-3 h-8 w-48" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
