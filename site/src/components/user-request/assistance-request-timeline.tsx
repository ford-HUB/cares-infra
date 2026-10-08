import { HandHeart } from 'lucide-react'
import { ASSISTANCE_FILTERS, type AssistanceFilter } from '../../constants/assistance-requests'
import { formatRequestDay } from '../../constants/user-requests'
import type { AssistanceDecision, AssistanceRequest } from '../../types/assistance-request'
import { AssistanceRequestItem } from './ui/assistance-request-item'

interface AssistanceRequestTimelineProps {
  requests: AssistanceRequest[]
  filter: AssistanceFilter
  onFilterChange: (filter: AssistanceFilter) => void
  busyId: string | null
  onDecide: (request: AssistanceRequest, decision: AssistanceDecision) => void
}

const EMPTY_MESSAGES: Record<AssistanceFilter, string> = {
  open: 'No assistance requests need action.',
  closed: 'No released, declined or cancelled requests yet.',
  all: 'No beneficiary has requested assistance yet.',
}

/** Groups by submission day, newest first — the same trail as the access queue. */
function groupByDay(requests: AssistanceRequest[]) {
  const groups = new Map<string, AssistanceRequest[]>()
  for (const request of [...requests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))) {
    const day = formatRequestDay(request.submittedAt)
    groups.set(day, [...(groups.get(day) ?? []), request])
  }
  return [...groups.entries()]
}

export function AssistanceRequestTimeline({
  requests,
  filter,
  onFilterChange,
  busyId,
  onDecide,
}: AssistanceRequestTimelineProps) {
  return (
    <div className="space-y-5">
      <div
        role="radiogroup"
        aria-label="Show requests"
        className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5"
      >
        {ASSISTANCE_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={item.value === filter}
            onClick={() => onFilterChange(item.value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              item.value === filter
                ? 'bg-[var(--cares-primary)] text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <HandHeart className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-3 text-sm text-gray-500">{EMPTY_MESSAGES[filter]}</p>
        </div>
      ) : (
        groupByDay(requests).map(([day, dayRequests]) => (
          <section key={day}>
            <h2 className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">
              {day}
            </h2>
            <ol className="space-y-3 border-l-2 border-gray-200 pl-0">
              {dayRequests.map((request) => (
                <AssistanceRequestItem
                  key={request.id}
                  request={request}
                  busy={busyId === request.id}
                  disabled={busyId !== null}
                  onDecide={onDecide}
                />
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  )
}
