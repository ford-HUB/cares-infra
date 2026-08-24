import { Inbox } from 'lucide-react'
import { formatRequestDay } from '../../constants/beneficiary-requests'
import type { BeneficiaryRequest } from '../../types/beneficiary-request'
import { RequestTimelineItem } from './ui/request-timeline-item'

interface UserRequestTimelineProps {
  requests: BeneficiaryRequest[]
  busyId: string | null
  onAccept: (request: BeneficiaryRequest) => void
  onDelete: (request: BeneficiaryRequest) => void
}

/** Groups the queue by submission day, newest first, keeping each day's rows in order. */
function groupByDay(requests: BeneficiaryRequest[]) {
  const groups = new Map<string, BeneficiaryRequest[]>()

  for (const request of [...requests].sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt),
  )) {
    const day = formatRequestDay(request.submittedAt)
    groups.set(day, [...(groups.get(day) ?? []), request])
  }

  return [...groups.entries()]
}

export function UserRequestTimeline({
  requests,
  busyId,
  onAccept,
  onDelete,
}: UserRequestTimelineProps) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <Inbox className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-3 text-sm text-gray-500">
          No beneficiary requests are waiting for review.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groupByDay(requests).map(([day, dayRequests]) => (
        <section key={day}>
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">
            {day}
          </h2>

          {/* The rail is one border on the list so it runs unbroken behind the dots. */}
          <ol className="space-y-3 border-l-2 border-gray-200 pl-0">
            {dayRequests.map((request) => (
              <RequestTimelineItem
                key={request.id}
                request={request}
                busy={busyId === request.id}
                disabled={busyId !== null}
                onAccept={onAccept}
                onDelete={onDelete}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
