import dayjs from 'dayjs'
import type { UserRequestKind, UserRequestStatus } from '../types/user-request'

export const REQUEST_REFERENCE_PREFIX = 'REQ-'
export const REQUEST_REFERENCE_PAD = 3

export function formatRequestReference(sequence: number): string {
  return `${REQUEST_REFERENCE_PREFIX}${String(sequence).padStart(REQUEST_REFERENCE_PAD, '0')}`
}

export const REQUEST_KIND_LABELS: Record<UserRequestKind, string> = {
  role_access: 'Volunteer Access',
  event_join: 'Event Join',
}

/**
 * The timeline reads top to bottom as one column of rows, so the kind is the only
 * thing telling them apart at a glance — each gets its own dot and chip colour.
 */
export const REQUEST_KIND_STYLES: Record<UserRequestKind, { chip: string; dot: string }> = {
  role_access: { chip: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  event_join: { chip: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
}

export const REQUEST_STATUS_LABELS: Record<UserRequestStatus, string> = {
  pending: 'Awaiting review',
  accepted: 'Accepted',
  deleted: 'Removed',
}

export const REQUEST_STATUS_STYLES: Record<UserRequestStatus, string> = {
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

export function formatEventDate(timestamp: string): string {
  return dayjs(timestamp).format('MMM D, YYYY · h:mm A')
}
