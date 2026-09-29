import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors the header card + three collapsed question cards the loaded builder draws. */
export function QuestionnaireBuilderSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="h-2.5 bg-gray-200" />
        <div className="space-y-3 px-5 py-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="rounded-xl border border-gray-200 bg-white px-5 pt-6 pb-5 shadow-sm"
        >
          <Skeleton className="h-4 w-1/2" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3.5 w-1/4" />
            <Skeleton className="h-3.5 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  )
}
