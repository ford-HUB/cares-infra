import { useState } from 'react'
import {
  CalendarDays,
  Check,
  FileText,
  Home,
  ImageIcon,
  Loader2,
  MapPin,
  MessageSquareWarning,
  Phone,
  UserCog,
  ScanFace,
  Trash2,
  XCircle,
} from 'lucide-react'
import {
  REQUEST_KIND_STYLES,
  formatEventDate,
  formatFileSize,
  formatRequestTime,
} from '../../../constants/user-requests'
import { formatRelativeTime } from '../../../constants/formatting'
import type { UserRequest, UserRequestAttachment } from '../../../types/user-request'
import { RequestAttachmentPreview } from './request-attachment-preview'
import { RequestKindChip, RequestStatusPill } from './request-type-chip'

interface RequestTimelineItemProps {
  request: UserRequest
  /** True while this row's own accept/delete call is in flight. */
  busy: boolean
  /** Any decision in flight — keeps a second click from racing the first. */
  disabled: boolean
  onAccept: (request: UserRequest) => void
  /** Opens the reason prompt; event applications, event roles and registrations can be rejected. */
  onReject: (request: UserRequest) => void
  onDelete: (request: UserRequest) => void
}

export function RequestTimelineItem({
  request,
  busy,
  disabled,
  onAccept,
  onReject,
  onDelete,
}: RequestTimelineItemProps) {
  const pending = request.status === 'pending'
  const registration = request.kind === 'beneficiary_registration'
  const rejectable = pending && request.kind !== 'role_access'
  const [preview, setPreview] = useState<UserRequestAttachment | null>(null)

  return (
    <li className="relative pl-10">
      {/* The dot sits on the rail drawn by the list, so it must keep this offset. */}
      <span
        className={`absolute top-5 left-[13px] h-2.5 w-2.5 rounded-full ring-4 ring-gray-50 ${REQUEST_KIND_STYLES[request.kind].dot}`}
        aria-hidden
      />

      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-gray-500">
            {request.reference}
          </span>
          <RequestKindChip kind={request.kind} />
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
          <span className="ml-2 text-xs font-medium text-gray-500">
            {request.submitter.role} account
          </span>
        </h3>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
          <span>{request.submitter.email}</span>
          {request.submitter.barangay && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {request.submitter.barangay}
            </span>
          )}
        </p>

        {/* A registration is a whole account being let in, so the director sees the
            contact details it was registered with — the other kinds come from an
            account the portal already knows. */}
        {registration && (
          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            <div className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3 text-gray-400" />
              <dt className="sr-only">Phone</dt>
              <dd>{request.submitter.phone}</dd>
            </div>
            <div className="inline-flex min-w-0 items-center gap-1">
              <Home className="h-3 w-3 shrink-0 text-gray-400" />
              <dt className="sr-only">Address</dt>
              <dd className="truncate">{request.submitter.address}</dd>
            </div>
          </dl>
        )}

        <p className="mt-2 text-sm text-gray-700">{request.summary}</p>

        {/* What the decision is about: the event for a join or a role, the proof
            for an unlock. An event role carries no proof — the reviewer decides
            on what they know of the volunteer. */}
        {request.participationRole && (
          <div className="mt-3 mr-2 inline-flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5">
            <UserCog className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-800">
              Requested role: {request.participationRole}
            </span>
          </div>
        )}
        {request.event && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs text-gray-700">{request.event.title}</span>
            <span className="text-[11px] text-gray-400">
              {formatEventDate(request.event.startsAt)}
            </span>
          </div>
        )}

        {request.attachments.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {request.attachments.map((attachment) => (
              <li key={attachment.kind}>
                <button
                  type="button"
                  onClick={() => setPreview(attachment)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 hover:bg-gray-100"
                >
                  {attachment.fileName ? (
                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5 text-gray-400" />
                  )}
                  <span className="text-xs text-gray-700">{attachment.label}</span>
                  {attachment.kind === 'supporting-document' && attachment.fileName && (
                    <span className="max-w-[16rem] truncate text-[11px] text-gray-400">
                      {attachment.fileName}
                      {attachment.sizeBytes !== undefined &&
                        ` · ${formatFileSize(attachment.sizeBytes)}`}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {request.faceSimilarity !== undefined && (
              <li className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5">
                <ScanFace className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs text-emerald-700">
                  Face match {Math.round(request.faceSimilarity * 100)}%
                </span>
              </li>
            )}
          </ul>
        )}

        {request.status === 'rejected' && request.rejectionReason && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
            <MessageSquareWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
            <div className="text-xs">
              <p className="font-medium text-red-800">Reason for rejection</p>
              <p className="mt-0.5 whitespace-pre-line text-red-700">{request.rejectionReason}</p>
            </div>
          </div>
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
            {/* A registration is approved or rejected, never binned — a removed one
                would leave the account shut with no decision on record. */}
            {!registration && (
              <button
                type="button"
                onClick={() => onDelete(request)}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
            {rejectable && (
              <button
                type="button"
                onClick={() => onReject(request)}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </button>
            )}
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
              {registration ? 'Approve' : 'Accept'}
            </button>
          </div>
        )}
      </article>

      {preview && (
        <RequestAttachmentPreview attachment={preview} onClose={() => setPreview(null)} />
      )}
    </li>
  )
}
