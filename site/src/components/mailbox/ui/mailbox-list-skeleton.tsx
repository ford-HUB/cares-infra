import { Skeleton } from '@/components/ui/skeleton'
import { MAILBOX_SKELETON_ROWS } from '../../../constants/mailbox'

/** Mirrors `MailboxMessageRow` — same `h-[68px]`, same padding, so nothing jumps. */
export function MailboxListSkeleton({ rows = MAILBOX_SKELETON_ROWS }: { rows?: number }) {
  return (
    <div aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex h-[68px] flex-col justify-center gap-1.5 border-b border-[var(--cares-border)] px-3"
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-2.5 w-28" />
            <Skeleton className="ml-auto h-2.5 w-10" />
          </div>
          <Skeleton className="h-2.5 w-3/4" />
          <Skeleton className="h-2.5 w-full" />
        </div>
      ))}
    </div>
  )
}
