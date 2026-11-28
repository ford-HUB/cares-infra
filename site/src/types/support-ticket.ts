export type SupportTicketStatus =
  | 'open'
  | 'in_progress'
  /** Waiting for the requester to confirm the fix. */
  | 'under_verification'
  /** Blocked on the requester. */
  | 'client_feedback'
  | 'resolved'
  | 'closed'

/** `high` = Issue, `medium` = Support, `low` = Feature. */
export type SupportTicketPriority = 'high' | 'medium' | 'low'

export type SupportTicketType =
  | 'bug'
  | 'login'
  | 'account'
  | 'verification'
  | 'event'
  | 'mobile_app'
  | 'feature_request'
  /** About another user, event or content, not the reporter's own account. */
  | 'report'
  | 'other'

export interface SupportTicketRequester {
  name: string
  email: string
  /** Lowercased RoleType. */
  role: string
}

export interface SupportTicketReply {
  id: string
  author: string
  authorType: 'staff' | 'requester'
  body: string
  createdAt: string
}

export interface SupportTicket {
  id: string
  /** e.g. `Support #010`. */
  reference: string
  subject: string
  description: string
  type: SupportTicketType
  status: SupportTicketStatus
  priority: SupportTicketPriority
  requester: SupportTicketRequester
  /** Unset while unassigned. */
  assignee?: string
  /** e.g. `Mobile app`, `Staff portal`. */
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

export interface SupportTicketBucketCount {
  priority: SupportTicketPriority
  total: number
  /** Anything not resolved or closed. */
  unresolved: number
}
