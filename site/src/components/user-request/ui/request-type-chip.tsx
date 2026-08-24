import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_STYLES,
  REQUEST_TYPE_LABELS,
  REQUEST_TYPE_STYLES,
} from '../../../constants/beneficiary-requests'
import type {
  BeneficiaryRequestStatus,
  BeneficiaryRequestType,
} from '../../../types/beneficiary-request'

export function RequestTypeChip({ type }: { type: BeneficiaryRequestType }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${REQUEST_TYPE_STYLES[type].chip}`}
    >
      {REQUEST_TYPE_LABELS[type]}
    </span>
  )
}

export function RequestStatusPill({ status }: { status: BeneficiaryRequestStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${REQUEST_STATUS_STYLES[status]}`}
    >
      {REQUEST_STATUS_LABELS[status]}
    </span>
  )
}
