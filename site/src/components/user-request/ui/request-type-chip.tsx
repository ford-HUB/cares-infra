import {
  REQUEST_KIND_LABELS,
  REQUEST_KIND_STYLES,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_STYLES,
} from '../../../constants/user-requests'
import type { UserRequestKind, UserRequestStatus } from '../../../types/user-request'

export function RequestKindChip({ kind }: { kind: UserRequestKind }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${REQUEST_KIND_STYLES[kind].chip}`}
    >
      {REQUEST_KIND_LABELS[kind]}
    </span>
  )
}

export function RequestStatusPill({ status }: { status: UserRequestStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${REQUEST_STATUS_STYLES[status]}`}
    >
      {REQUEST_STATUS_LABELS[status]}
    </span>
  )
}
