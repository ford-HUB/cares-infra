import { Loader2, RotateCcw, Trash2, X } from 'lucide-react'
import { formatRelativeTime } from '../../../constants/formatting'
import type { BeneficiaryRequest } from '../../../types/beneficiary-request'
import { RequestTypeChip } from './request-type-chip'

interface DeletedRequestsModalProps {
  requests: BeneficiaryRequest[]
  busyId: string | null
  onRestore: (request: BeneficiaryRequest) => void
  onClose: () => void
}

/**
 * The recycle bin. Deleting only moves a request out of the queue, so the director
 * can put it back — either to accept it after all, or leave it here for good.
 */
export function DeletedRequestsModal({
  requests,
  busyId,
  onRestore,
  onClose,
}: DeletedRequestsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-lg">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Deleted requests</h3>
            <p className="mt-1 text-sm text-gray-600">
              Restore a request to send it back to the review queue, or leave it here.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close deleted requests"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {requests.length === 0 ? (
            <div className="py-10 text-center">
              <Trash2 className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">Nothing has been deleted yet.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {requests.map((request) => (
                <li
                  key={request.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-gray-500">
                      {request.reference}
                    </span>
                    <RequestTypeChip type={request.type} />
                    <span className="ml-auto text-xs text-gray-500">
                      Removed {request.decidedAt ? formatRelativeTime(request.decidedAt) : ''}
                      {request.decidedBy ? ` by ${request.decidedBy}` : ''}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {request.submitter.name}
                  </p>
                  <p className="text-sm text-gray-600">{request.summary}</p>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onRestore(request)}
                      disabled={busyId !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {busyId === request.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      Restore
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
