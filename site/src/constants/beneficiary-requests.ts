import dayjs from 'dayjs'
import type {
  BeneficiaryRequestStatus,
  BeneficiaryRequestType,
} from '../types/beneficiary-request'

export const REQUEST_TYPE_LABELS: Record<BeneficiaryRequestType, string> = {
  verification_proof: 'Verification Proof',
  residency_proof: 'Residency Proof',
  income_proof: 'Income Proof',
  medical_assistance: 'Medical Assistance',
  household_update: 'Household Update',
}

/**
 * The timeline reads top to bottom as one column of rows, so the type is the only
 * thing telling them apart at a glance — each gets its own dot and chip colour.
 */
export const REQUEST_TYPE_STYLES: Record<
  BeneficiaryRequestType,
  { chip: string; dot: string }
> = {
  verification_proof: { chip: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  residency_proof: { chip: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  income_proof: { chip: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  medical_assistance: { chip: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  household_update: { chip: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
}

export const REQUEST_STATUS_LABELS: Record<BeneficiaryRequestStatus, string> = {
  pending: 'Awaiting review',
  accepted: 'Accepted',
  deleted: 'Removed',
}

export const REQUEST_STATUS_STYLES: Record<BeneficiaryRequestStatus, string> = {
  pending: 'bg-blue-50 text-blue-700',
  accepted: 'bg-green-50 text-green-700',
  deleted: 'bg-gray-100 text-gray-600',
}

/** Rows the skeleton draws before the first fetch settles. */
export const REQUEST_SKELETON_ROWS = 4

/** Timeline headings group the queue by the day the request came in. */
export function formatRequestDay(timestamp: string): string {
  const value = dayjs(timestamp)
  const today = dayjs()

  if (value.isSame(today, 'day')) return 'Today'
  if (value.isSame(today.subtract(1, 'day'), 'day')) return 'Yesterday'
  return value.format('MMMM D, YYYY')
}

export function formatRequestTime(timestamp: string): string {
  return dayjs(timestamp).format('h:mm A')
}
