import { Skeleton } from '@/components/ui/skeleton'
import { EVENT_MAP_HEIGHT_CLASS } from '../../../constants/event-map'

/** Mirrors the event map page's toolbar + map frame while the first fetch runs. */
export function EventMapSkeleton() {
  return (
    <div aria-hidden className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="ml-auto h-8 w-32" />
      </div>
      <Skeleton className={`w-full rounded-xl ${EVENT_MAP_HEIGHT_CLASS}`} />
    </div>
  )
}
