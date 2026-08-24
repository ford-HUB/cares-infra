import { Check, FileText, Loader2, MapPin, Trash2 } from 'lucide-react'
import {
  REQUEST_TYPE_STYLES,
  formatRequestTime,
} from '../../../constants/beneficiary-requests'
import { formatFileSize, formatRelativeTime } from '../../../constants/formatting'
import type { BeneficiaryRequest } from '../../../types/beneficiary-request'
import { RequestStatusPill, RequestTypeChip } from './request-type-chip'

interface RequestTimelineItemProps {
  request: BeneficiaryRequest
  /** True while this row's own accept/delete call is in flight. */
  busy: boolean
  /** Any decision in flight — keeps a second click from racing the first. */
  disabled: boolean
  onAccept: (request: BeneficiaryRequest) => void
  onDelete: (request: BeneficiaryRequest) => void
}

export function RequestTimelineItem({
  request,
  busy,
  disabled,
  onAccept,
  onDelete,
}: RequestTimelineItemProps) {
  const pending = request.status === 'pending'

  return (
    <li className="relative pl-10">
      {/* The dot sits on the rail drawn by the list, so it must keep this offset. */}
      <span
        className={`absolute top-5 left-[13px] h-2.5 w-2.5 rounded-full ring-4 ring-gray-50 ${REQUEST_TYPE_STYLES[request.type].dot}`}
        aria-hidden
      />

      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-gray-500">
            {request.reference}
          </span>
          <RequestTypeChip type={request.type} />
          <RequestStatusPill status={request.status} />
          <span
            className="ml-auto text-xs text-gray-500"
            title={formatRelativeTime(request.submittedAt)}
          >
            {formatRequestTime(request.submittedAt)}
          </span>
        </div>

        <h3 className="mt-2 text-sm font-semibold text-gray-900">
          {request.submitter.name}
        </h3>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
          <span>{request.submitter.email}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {request.submitter.barangay}
          </span>
        </p>

        <p className="mt-2 text-sm text-gray-700">{request.summary}</p>

        {request.attachments.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {request.attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-gray-700">{attachment.label}</span>
                <span className="text-[11px] text-gray-400">
                  {formatFileSize(attachment.sizeBytes)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* The trail is what makes the row readable after a decision — it says who
            acted and when, which the status pill alone can't. */}
        <ol className="mt-3 space-y-1 border-t border-gray-100 pt-3">
          {request.trail.map((entry) => (
            <li key={entry.id} className="text-xs text-gray-500">
              <span className="text-gray-700">{entry.label}</span>
              {' — '}
              {entry.actor} · {formatRelativeTime(entry.at)}
            </li>
          ))}
        </ol>

        {pending && (
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onDelete(request)}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <button
              type="button"
              onClick={() => onAccept(request)}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--cares-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Accept
            </button>
          </div>
        )}
      </article>
    </li>
  )
}
