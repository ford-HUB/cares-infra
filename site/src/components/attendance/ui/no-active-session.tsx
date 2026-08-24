import { CalendarClock } from 'lucide-react'

/**
 * Shown when nothing of today's has started yet. The monitor is only meaningful for a
 * running event — the finished roster and its ruling live on the Attendees page.
 */
export function NoActiveSession() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <CalendarClock className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-gray-900">
        No event is running right now
      </h2>
      <p className="mt-1 max-w-md text-[13px] text-gray-500">
        Live attendance appears here once an event scheduled for today has started and
        volunteer devices begin pushing coordinates.
      </p>
    </div>
  )
}
