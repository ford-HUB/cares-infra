import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface NotificationsSkeletonProps {
  /** Roughly what the loaded week shows, so the swap causes no jump. */
  groups: number
  rowsPerGroup: number
}

/** Mirrors the section heading, and the day-grouped rows under it. */
export function NotificationsSkeleton({ groups, rowsPerGroup }: NotificationsSkeletonProps) {
  return (
    <div aria-hidden className="space-y-4">
      <div className="flex items-center gap-3 pt-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-8 rounded-full" />
      </div>

      {Array.from({ length: groups }, (_, group) => (
        <section key={`notification-group-${group}`}>
          <div className="mb-2 flex items-center gap-3">
            <Skeleton className="h-3 w-24" />
            <span className="h-px flex-1 bg-gray-100" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Card className="gap-0 py-0 shadow-sm">
            <ul className="divide-y divide-gray-100">
              {Array.from({ length: rowsPerGroup }, (_, row) => (
                <li
                  key={`notification-row-${group}-${row}`}
                  className="flex gap-3 px-4 py-3.5"
                >
                  <div className="w-16 shrink-0 space-y-1.5">
                    <Skeleton className="ml-auto h-3 w-12" />
                    <Skeleton className="ml-auto h-2.5 w-14" />
                  </div>
                  <Skeleton className="w-1 self-stretch rounded-full" />
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  )
}
