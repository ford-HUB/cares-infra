/** Which part of CARES produced the entry — drives the category filter and colouring. */
export type AuditLogCategory =
  | 'authentication'
  | 'access-control'
  | 'user-management'
  | 'verification'
  | 'event'
  | 'certificate'
  | 'communication'
  | 'system'

/** Did the attempt go through? `denied` is a permission refusal, not a server error. */
export type AuditLogOutcome = 'success' | 'failure' | 'denied'

export type AuditLogSeverity = 'info' | 'notice' | 'warning' | 'critical'

/** Who performed the action. Denormalised on write so a later rename can't rewrite history. */
export interface AuditLogActor {
  id: string
  name: string
  email: string
  /** Lowercased RoleType at the time of the action — `admin`, `director`, … */
  role: string
}

/** What the action was performed on. */
export interface AuditLogTarget {
  /** `user`, `event`, `certificate`, `role`, `session`, `system`, … */
  type: string
  label: string
  id?: string
}

/** One field-level before/after pair, so a change is reviewable without a diff tool. */
export interface AuditLogChange {
  field: string
  before?: string
  after?: string
}

export interface AuditLogEntry {
  id: string
  createdAt: string
  /** Machine key, e.g. `access-control.permission.revoked` — stable across wording changes. */
  action: string
  /** Human sentence rendered in the grid. */
  description: string
  category: AuditLogCategory
  severity: AuditLogSeverity
  outcome: AuditLogOutcome
  actor: AuditLogActor
  target: AuditLogTarget
  ipAddress: string
  userAgent: string
  /** Correlates every entry written by a single request. */
  requestId: string
  /** Which client wrote it — the portal, the volunteer app, or a background job. */
  source: 'portal' | 'mobile' | 'system'
  changes: AuditLogChange[]
  /** Free-form context (event name, ticket id, ML score, …). */
  metadata: Record<string, string>
  /** Operator-supplied justification, when the action asks for one. */
  reason?: string
}

export type AuditLogRange = '24h' | '7d' | '30d' | 'all'

/** The filters alone — what a scroll page has to repeat to stay on the same result set. */
export interface AuditLogFilters {
  search?: string
  category?: AuditLogCategory | 'all'
  severity?: AuditLogSeverity | 'all'
  outcome?: AuditLogOutcome | 'all'
  range?: AuditLogRange
}

export interface AuditLogQuery extends AuditLogFilters {
  /** Id of the last entry already shown; the next page starts after it. */
  cursor?: string
  limit?: number
}

export interface AuditLogPage {
  success: boolean
  message?: string
  list: AuditLogEntry[]
  /** Total matching entries on the server, across every page. */
  total: number
  /** Absent once the trail is exhausted — that is how the scroll knows to stop. */
  nextCursor?: string
}
