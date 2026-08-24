export type SupportTicketStatus =
  | 'open'
  | 'in_progress'
  /** Fix is in — waiting for the requester to confirm it works on their side. */
  | 'under_verification'
  /** Blocked on the requester: more detail or a decision is needed from them. */
  | 'client_feedback'
  | 'resolved'
  | 'closed'

/**
 * Priority doubles as the ticket's bucket on the mini dashboard:
 * `high` = Issue, `medium` = Support, `low` = Feature.
 */
export type SupportTicketPriority = 'high' | 'medium' | 'low'

/** What the reporter says went wrong — drives triage routing and the type filter. */
export type SupportTicketType =
  | 'bug'
  | 'login'
  | 'account'
  | 'verification'
  | 'event'
  | 'mobile_app'
  | 'feature_request'
  | 'other'

export interface SupportTicketRequester {
  name: string
  email: string
  /** Lowercased RoleType — `volunteer`, `coordinator`, `director`, … */
  role: string
}

export interface SupportTicketReply {
  id: string
  author: string
  /** `staff` replies render on the portal side of the thread, `requester` on the other. */
  authorType: 'staff' | 'requester'
  body: string
  createdAt: string
}

export interface SupportTicket {
  id: string
  /** Sequential tracking number — 10th ticket filed is `Support #010`. */
  reference: string
  subject: string
  description: string
  type: SupportTicketType
  status: SupportTicketStatus
  priority: SupportTicketPriority
  requester: SupportTicketRequester
  /** Portal account handling the ticket; unset while the ticket is unassigned. */
  assignee?: string
  /** Where the report came from, e.g. `Mobile app`, `Staff portal`. */
  source: string
  createdAt: string
  updatedAt: string
  replies: SupportTicketReply[]
}

export interface SupportTicketSummary {
  total: number
  open: number
  inProgress: number
  resolved: number
}

/** One mini-dashboard tile: a priority bucket with its counts. */
export interface SupportTicketBucketCount {
  priority: SupportTicketPriority
  total: number
  /** Still needing work — anything not resolved or closed. */
  unresolved: number
}
