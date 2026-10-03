import type { useAssistanceRequestReview } from '../../hooks/use-assistance-request-review'
import { AssistanceRequestTimeline } from './assistance-request-timeline'
import { AssistanceDecisionModal } from './ui/assistance-decision-modal'
import { UserRequestTimelineSkeleton } from './ui/user-request-timeline-skeleton'

type AssistanceRequestTabPanelProps = ReturnType<typeof useAssistanceRequestReview>

/** The Assistance tab of the Request page: error banner, queue, and the note prompt. */
export function AssistanceRequestTabPanel({
  requests,
  showSkeleton,
  error,
  retry,
  filter,
  setFilter,
  busyId,
  onDecide,
  noting,
  onConfirmNote,
  closeNote,
}: AssistanceRequestTabPanelProps) {
  return (
    <>
      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={retry}
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
          <AssistanceRequestTimeline
            requests={requests}
            filter={filter}
            onFilterChange={setFilter}
            busyId={busyId}
            onDecide={onDecide}
          />
        )}
      </div>

      {noting && (
        <AssistanceDecisionModal
          key={`${noting.request.id}-${noting.decision}`}
          request={noting.request}
          decision={noting.decision}
          busy={busyId === noting.request.id}
          onConfirm={onConfirmNote}
          onClose={closeNote}
        />
      )}
    </>
  )
}
