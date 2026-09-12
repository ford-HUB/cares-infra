import type {
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
} from '../types/support-ticket'

export const TICKET_STATUS_FILTER_ALL = 'all'
export const TICKET_TYPE_FILTER_ALL = 'all'
export const TICKET_PRIORITY_FILTER_ALL = 'all'

export type TicketStatusFilter = SupportTicketStatus | typeof TICKET_STATUS_FILTER_ALL
export type TicketTypeFilter = SupportTicketType | typeof TICKET_TYPE_FILTER_ALL
export type TicketPriorityFilter =
  | SupportTicketPriority
  | typeof TICKET_PRIORITY_FILTER_ALL

export const TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  under_verification: 'Under Client Verification',
  client_feedback: 'Client Feedback',
  resolved: 'Resolved',
  closed: 'Closed',
}

/** What each status means, shown beside the option in the update dialog. */
export const TICKET_STATUS_HINTS: Record<SupportTicketStatus, string> = {
  open: 'Reported, not picked up yet',
  in_progress: 'Someone is working on it',
  under_verification: 'Fixed — waiting for the requester to confirm',
  client_feedback: 'Blocked, waiting on the requester',
  resolved: 'Confirmed fixed',
  closed: 'Finished, no further action',
}

/** Still counts against the queue — anything not resolved or closed. */
export const TICKET_UNRESOLVED_STATUSES: SupportTicketStatus[] = [
  'open',
  'in_progress',
  'under_verification',
  'client_feedback',
]

export const TICKET_TYPE_LABELS: Record<SupportTicketType, string> = {
  bug: 'Bug',
  login: 'Login Issue',
  account: 'Account',
  verification: 'Verification',
  event: 'Event',
  mobile_app: 'Mobile App',
  feature_request: 'Feature Request',
  report: 'Report',
  other: 'Other',
}

/**
 * The three buckets the portal triages by. Priority and category are the same axis
 * here — an Issue is by definition the high-priority bucket, a Feature the low one.
 */
export const TICKET_PRIORITY_LABELS: Record<SupportTicketPriority, string> = {
  high: 'Issue',
  medium: 'Support',
  low: 'Feature',
}

/** Plain-language line under each mini-dashboard tile. */
export const TICKET_PRIORITY_CAPTIONS: Record<SupportTicketPriority, string> = {
  high: 'High priority — broken or blocking',
  medium: 'Medium priority — help requests',
  low: 'Low priority — improvement ideas',
}

/** Tile order on the mini dashboard, most urgent first. */
export const TICKET_PRIORITY_ORDER: SupportTicketPriority[] = ['high', 'medium', 'low']

/** Prefix + zero padding for the tracking number, e.g. `Support #007`. */
export const TICKET_REFERENCE_PREFIX = 'Support #'
export const TICKET_REFERENCE_PAD = 3

export function formatTicketReference(sequence: number): string {
  return `${TICKET_REFERENCE_PREFIX}${String(sequence).padStart(TICKET_REFERENCE_PAD, '0')}`
}

/** Workflow order — also the option order in the update dialog. */
export const TICKET_STATUS_ORDER: SupportTicketStatus[] = [
  'open',
  'in_progress',
  'under_verification',
  'client_feedback',
  'resolved',
  'closed',
]

export const TICKET_STATUS_FILTERS: { value: TicketStatusFilter; label: string }[] = [
  { value: TICKET_STATUS_FILTER_ALL, label: 'All Status' },
  ...TICKET_STATUS_ORDER.map((value) => ({
    value: value as TicketStatusFilter,
    label: TICKET_STATUS_LABELS[value],
  })),
]

export const TICKET_TYPE_FILTERS: { value: TicketTypeFilter; label: string }[] = [
  { value: TICKET_TYPE_FILTER_ALL, label: 'All Types' },
  ...(Object.keys(TICKET_TYPE_LABELS) as SupportTicketType[]).map((value) => ({
    value,
    label: TICKET_TYPE_LABELS[value],
  })),
]

/** Ordering used when sorting the grid — issues first, so triage reads top-down. */
export const TICKET_PRIORITY_RANK: Record<SupportTicketPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}
