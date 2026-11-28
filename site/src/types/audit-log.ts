export type AuditLogCategory =
  | 'authentication'
  | 'access-control'
  | 'user-management'
  | 'verification'
  | 'event'
  | 'certificate'
  | 'communication'
  | 'system'

/** `denied` is a permission refusal, not a server error. */
export type AuditLogOutcome = 'success' | 'failure' | 'denied'

export type AuditLogSeverity = 'info' | 'notice' | 'warning' | 'critical'

/** Denormalised on write so a later rename can't rewrite history. */
export interface AuditLogActor {
  id: string
  name: string
  email: string
  /** Lowercased RoleType at the time of the action. */
  role: string
}

export interface AuditLogTarget {
  type: string
  label: string
  id?: string
}

export interface AuditLogChange {
  field: string
  before?: string
  after?: string
}

export interface AuditLogEntry {
  id: string
  createdAt: string
  /** Machine key, e.g. `access-control.permission.revoked`; stable across wording changes. */
  action: string
  description: string
  category: AuditLogCategory
  severity: AuditLogSeverity
  outcome: AuditLogOutcome
  actor: AuditLogActor
  target: AuditLogTarget
  ipAddress: string
  userAgent: string
  requestId: string
  source: 'portal' | 'mobile' | 'system'
  changes: AuditLogChange[]
  metadata: Record<string, string>
  reason?: string
}

export type AuditLogRange = '24h' | '7d' | '30d' | 'all'

export interface AuditLogFilters {
  search?: string
  category?: AuditLogCategory | 'all'
  severity?: AuditLogSeverity | 'all'
  outcome?: AuditLogOutcome | 'all'
  range?: AuditLogRange
}

export interface AuditLogQuery extends AuditLogFilters {
  cursor?: string
  limit?: number
}

export interface AuditLogPage {
  success: boolean
  message?: string
  list: AuditLogEntry[]
  total: number
  /** Absent once exhausted. */
  nextCursor?: string
}
