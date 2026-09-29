import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { InlinePageHeader } from '../../components/portal/ui/page-chrome'
import { UserRequestTimeline } from '../../components/user-request/user-request-timeline'
import { DeletedRequestsModal } from '../../components/user-request/ui/deleted-requests-modal'
import { UserRequestTimelineSkeleton } from '../../components/user-request/ui/user-request-timeline-skeleton'
import { useUserRequestStore } from '../../store/user-request-store'
import type { UserRequest } from '../../types/user-request'

export function UserRequestPage() {
  const requests = useUserRequestStore((s) => s.requests)
  const loading = useUserRequestStore((s) => s.loading)
  const initialized = useUserRequestStore((s) => s.initialized)
  const error = useUserRequestStore((s) => s.error)
  const fetchRequests = useUserRequestStore((s) => s.fetchRequests)
  const accept = useUserRequestStore((s) => s.accept)
  const remove = useUserRequestStore((s) => s.remove)
  const restore = useUserRequestStore((s) => s.restore)

  const [busyId, setBusyId] = useState<string | null>(null)
  const [binOpen, setBinOpen] = useState(false)

  useEffect(() => {
    void fetchRequests()
  }, [fetchRequests])

  // Deleted rows live in the bin, not the timeline — everything else stays on the
  // trail so an accepted request keeps its place in the day it came in.
  const timeline = useMemo(
    () => requests.filter((request) => request.status !== 'deleted'),
    [requests],
  )
  const deleted = useMemo(
    () => requests.filter((request) => request.status === 'deleted'),
    [requests],
  )

  const runDecision = async (
    request: UserRequest,
    action: () => Promise<void>,
    message: string,
  ) => {
    setBusyId(request.id)
    try {
      await action()
      toast.success(message)
    } catch (error) {
      // The server's message says why — a full event, an already-decided row.
      toast.error(error instanceof Error ? error.message : 'The request could not be updated')
    } finally {
      setBusyId(null)
    }
  }

  const handleAccept = (request: UserRequest) =>
    void runDecision(
      request,
      () => accept(request.id),
      `${request.reference} accepted`,
    )

  const handleDelete = (request: UserRequest) =>
    void runDecision(
      request,
      () => remove(request.id),
      `${request.reference} moved to deleted requests`,
    )

  const handleRestore = (request: UserRequest) =>
    void runDecision(
      request,
      () => restore(request.id),
      `${request.reference} restored to the queue`,
    )

  const showSkeleton = !initialized || (loading && requests.length === 0)

  return (
    <ContentShell>
      <InlinePageHeader
        title="User Request"
        description="Volunteer access requests from donors and beneficiaries, and beneficiary event-join requests, submitted from the mobile app."
        action={
          <button
            type="button"
            onClick={() => setBinOpen(true)}
            aria-label="View deleted requests"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Trash2 className="h-4 w-4" />
            Deleted
            {deleted.length > 0 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                {deleted.length}
              </span>
            )}
          </button>
        }
      />

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchRequests()}
            className="font-medium underline underline-offset-2 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      <div aria-busy={showSkeleton}>
        {showSkeleton ? (
          <UserRequestTimelineSkeleton />
        ) : (
          <UserRequestTimeline
            requests={timeline}
            busyId={busyId}
            onAccept={handleAccept}
            onDelete={handleDelete}
          />
        )}
      </div>

      {binOpen && (
        <DeletedRequestsModal
          requests={deleted}
          busyId={busyId}
          onRestore={handleRestore}
          onClose={() => setBinOpen(false)}
        />
      )}
    </ContentShell>
  )
}
