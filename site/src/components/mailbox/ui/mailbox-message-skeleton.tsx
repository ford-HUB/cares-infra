import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors the reading pane: header block, meta line, then body lines. */
export function MailboxMessageSkeleton() {
  return (
    <div className="p-4" aria-hidden>
      <Skeleton className="h-4 w-2/3" />
      <div className="mt-3 flex items-center gap-2.5">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-2.5 w-40" />
          <Skeleton className="h-2.5 w-56" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton
            key={index}
            className={`h-2.5 ${index % 4 === 3 ? 'w-2/5' : 'w-full'}`}
          />
        ))}
      </div>
    </div>
  )
}
