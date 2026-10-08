import { MAPBOX_ACCESS_TOKEN } from './mapbox'
import type {
  AssistanceCategory,
  AssistanceRequestStatus,
  AssistanceUrgency,
} from '../types/assistance-request'

export const ASSISTANCE_STATUS_LABELS: Record<AssistanceRequestStatus, string> = {
  pending: 'Awaiting review',
  under_review: 'Under review',
  approved: 'Approved',
  completed: 'Released',
  declined: 'Declined',
  cancelled: 'Cancelled by beneficiary',
}

export const ASSISTANCE_STATUS_STYLES: Record<AssistanceRequestStatus, string> = {
  pending: 'bg-blue-50 text-blue-700',
  under_review: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  completed: 'bg-emerald-50 text-emerald-800',
  declined: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

/** Dot on the timeline rail — still-open requests stand out from closed ones. */
export const ASSISTANCE_STATUS_DOTS: Record<AssistanceRequestStatus, string> = {
  pending: 'bg-blue-500',
  under_review: 'bg-amber-500',
  approved: 'bg-green-500',
  completed: 'bg-emerald-700',
  declined: 'bg-red-400',
  cancelled: 'bg-gray-300',
}

export const ASSISTANCE_CATEGORY_LABELS: Record<AssistanceCategory, string> = {
  food: 'Food',
  medical: 'Medical',
  education: 'Education',
  financial: 'Financial',
  livelihood: 'Livelihood',
  disaster_relief: 'Disaster relief',
}

export const ASSISTANCE_URGENCY_LABELS: Record<AssistanceUrgency, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}

/** Only the two top levels earn colour; low and normal stay quiet. */
export const ASSISTANCE_URGENCY_STYLES: Record<AssistanceUrgency, string> = {
  low: 'bg-gray-50 text-gray-600',
  normal: 'bg-gray-50 text-gray-600',
  high: 'bg-orange-50 text-orange-700',
  urgent: 'bg-red-600 text-white',
}

/** Requests the desk still has to act on. */
export const OPEN_ASSISTANCE_STATUSES: readonly AssistanceRequestStatus[] = [
  'pending',
  'under_review',
  'approved',
]

export type AssistanceFilter = 'open' | 'closed' | 'all'

export const ASSISTANCE_FILTERS: { value: AssistanceFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
]

/** Kept in step with the server's cap on an approval note or decline reason. */
export const ASSISTANCE_NOTE_MAX_LENGTH = 500

export const ASSISTANCE_STATIC_MAP_SIZE = { width: 560, height: 220 } as const
export const ASSISTANCE_STATIC_MAP_ZOOM = 15

/** Mapbox static image of the pin; null without a token, so the card links out only. */
export function assistanceStaticMapUrl(latitude: number, longitude: number): string | null {
  if (!MAPBOX_ACCESS_TOKEN) return null
  const { width, height } = ASSISTANCE_STATIC_MAP_SIZE
  const point = `${longitude},${latitude}`
  return (
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
    `pin-l+e53935(${point})/${point},${ASSISTANCE_STATIC_MAP_ZOOM},0/` +
    `${width}x${height}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`
  )
}

export function assistanceMapsLink(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
}

export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}
