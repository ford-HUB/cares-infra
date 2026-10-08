import { useState } from 'react'
import {
  Ban,
  Check,
  FileText,
  ImageIcon,
  Loader2,
  MapPin,
  MessageSquareText,
  PackageCheck,
  SearchCheck,
  Users,
  XCircle,
} from 'lucide-react'
import {
  ASSISTANCE_CATEGORY_LABELS,
  ASSISTANCE_STATUS_DOTS,
  ASSISTANCE_STATUS_LABELS,
  ASSISTANCE_STATUS_STYLES,
  ASSISTANCE_URGENCY_LABELS,
  ASSISTANCE_URGENCY_STYLES,
} from '../../../constants/assistance-requests'
import { formatRelativeTime } from '../../../constants/formatting'
import { formatRequestTime } from '../../../constants/user-requests'
import type {
  AssistanceDecision,
  AssistanceRequest,
  AssistanceRequestAttachment,
} from '../../../types/assistance-request'
import { AssistanceLocationCard } from './assistance-location-card'
import { RequestAttachmentPreview } from './request-attachment-preview'

interface AssistanceRequestItemProps {
  request: AssistanceRequest
  /** True while this row's own call is in flight. */
  busy: boolean
  /** Any move in flight — keeps a second click from racing the first. */
  disabled: boolean
  onDecide: (request: AssistanceRequest, decision: AssistanceDecision) => void
}

const ACTION_BUTTON =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50'

export function AssistanceRequestItem({
  request,
  busy,
  disabled,
  onDecide,
}: AssistanceRequestItemProps) {
  const [preview, setPreview] = useState<AssistanceRequestAttachment | null>(null)
  const { status } = request
  const canReview = status === 'pending'
  const canDecide = status === 'pending' || status === 'under_review'
  const canRelease = status === 'approved'

  return (
    <li className="relative pl-10">
      {/* The dot sits on the rail drawn by the list, so it must keep this offset. */}
      <span
        className={`absolute top-5 left-[13px] h-2.5 w-2.5 rounded-full ring-4 ring-gray-50 ${ASSISTANCE_STATUS_DOTS[status]}`}
        aria-hidden
      />

      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-gray-500">{request.reference}</span>
          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
            {ASSISTANCE_CATEGORY_LABELS[request.category]}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ASSISTANCE_URGENCY_STYLES[request.urgency]}`}
          >
            {ASSISTANCE_URGENCY_LABELS[request.urgency]} urgency
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ASSISTANCE_STATUS_STYLES[status]}`}
          >
            {ASSISTANCE_STATUS_LABELS[status]}
          </span>
          <span
            className="ml-auto text-xs text-gray-500"
            title={formatRelativeTime(request.submittedAt)}
          >
            {formatRequestTime(request.submittedAt)}
          </span>
        </div>

        <h3 className="mt-2 text-sm font-semibold text-gray-900">{request.title}</h3>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{request.requester.name}</span>
          <span>{request.requester.email}</span>
          {request.requester.barangay && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {request.requester.barangay}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            Household of {request.householdSize}
          </span>
        </p>

        <p className="mt-2 text-sm whitespace-pre-line text-gray-700">{request.description}</p>

        {request.location ? (
          <AssistanceLocationCard location={request.location} />
        ) : (
          <p className="mt-3 text-xs text-gray-400">No location pinned.</p>
        )}

        {request.attachments.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {request.attachments.map((attachment) => (
              <li key={attachment.id}>
                <button
                  type="button"
                  onClick={() => setPreview(attachment)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 hover:bg-gray-100"
                >
                  {attachment.contentType === 'application/pdf' ? (
                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5 text-gray-400" />
                  )}
                  <span className="max-w-48 truncate text-xs text-gray-700">
                    {attachment.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {request.statusNote &&
          (status === 'approved' || status === 'declined' || status === 'completed') && (
            <Note
              tone={status === 'declined' ? 'red' : 'green'}
              title={status === 'declined' ? 'Reason for declining' : 'Note to the beneficiary'}
              body={request.statusNote}
            />
          )}
        {status === 'cancelled' && (
          <Note
            tone="gray"
            title="Cancelled by the beneficiary"
            body={request.cancelReason ?? 'No reason was given.'}
          />
        )}

        <ol className="mt-3 space-y-1 border-t border-gray-100 pt-3">
          {request.stages.map((stage) => (
            <li key={stage.label} className="text-xs text-gray-500">
              <span className="text-gray-700">{stage.label}</span>
              {' · '}
              {formatRelativeTime(stage.at)}
            </li>
          ))}
        </ol>

        {(canDecide || canRelease) && (
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {canReview && (
              <button
                type="button"
                onClick={() => onDecide(request, 'review')}
                disabled={disabled}
                className={`${ACTION_BUTTON} border border-gray-300 text-gray-700 hover:bg-gray-50`}
              >
                <SearchCheck className="h-3.5 w-3.5" />
                Start review
              </button>
            )}
            {canDecide && (
              <>
                <button
                  type="button"
                  onClick={() => onDecide(request, 'decline')}
                  disabled={disabled}
                  className={`${ACTION_BUTTON} border border-red-200 text-red-700 hover:bg-red-50`}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => onDecide(request, 'approve')}
                  disabled={disabled}
                  className={`${ACTION_BUTTON} bg-[var(--cares-primary)] text-white hover:opacity-90`}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Approve
                </button>
              </>
            )}
            {canRelease && (
              <button
                type="button"
                onClick={() => onDecide(request, 'complete')}
                disabled={disabled}
                className={`${ACTION_BUTTON} bg-[var(--cares-primary)] text-white hover:opacity-90`}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PackageCheck className="h-3.5 w-3.5" />
                )}
                Mark as released
              </button>
            )}
          </div>
        )}
      </article>

      {preview && (
        <RequestAttachmentPreview attachment={preview} onClose={() => setPreview(null)} />
      )}
    </li>
  )
}

const NOTE_TONES = {
  red: {
    box: 'border-red-100 bg-red-50',
    title: 'text-red-800',
    body: 'text-red-700',
    icon: XCircle,
  },
  green: {
    box: 'border-green-100 bg-green-50',
    title: 'text-green-800',
    body: 'text-green-700',
    icon: MessageSquareText,
  },
  gray: {
    box: 'border-gray-200 bg-gray-50',
    title: 'text-gray-700',
    body: 'text-gray-600',
    icon: Ban,
  },
} as const

function Note({
  tone,
  title,
  body,
}: {
  tone: keyof typeof NOTE_TONES
  title: string
  body: string
}) {
  const style = NOTE_TONES[tone]
  const Icon = style.icon
  return (
    <div className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 ${style.box}`}>
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${style.title}`} />
      <div className="text-xs">
        <p className={`font-medium ${style.title}`}>{title}</p>
        <p className={`mt-0.5 whitespace-pre-line ${style.body}`}>{body}</p>
      </div>
    </div>
  )
}
