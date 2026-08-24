import {
  AUDIT_DEFAULT_RANGE,
  AUDIT_FILTER_ALL,
  AUDIT_PAGE_SIZE,
} from '../constants/audit-logs'
import type {
  AuditLogCategory,
  AuditLogEntry,
  AuditLogOutcome,
  AuditLogPage,
  AuditLogQuery,
  AuditLogSeverity,
} from '../types/audit-log'
import { apiClient, parseApiError } from './api-client'

/** Server enums are SCREAMING_SNAKE; the portal's own vocabulary is kebab-case. */
const CATEGORY_FROM_API: Record<string, AuditLogCategory> = {
  AUTHENTICATION: 'authentication',
  ACCESS_CONTROL: 'access-control',
  USER_MANAGEMENT: 'user-management',
  VERIFICATION: 'verification',
  EVENT: 'event',
  CERTIFICATE: 'certificate',
  COMMUNICATION: 'communication',
  SYSTEM: 'system',
}

const CATEGORY_TO_API: Record<AuditLogCategory, string> = {
  authentication: 'AUTHENTICATION',
  'access-control': 'ACCESS_CONTROL',
  'user-management': 'USER_MANAGEMENT',
  verification: 'VERIFICATION',
  event: 'EVENT',
  certificate: 'CERTIFICATE',
  communication: 'COMMUNICATION',
  system: 'SYSTEM',
}

interface AuditLogChangeApiResponse {
  field: string
  before: string | null
  after: string | null
}

interface AuditLogApiResponse {
  audit_log_id: string
  action: string
  description: string
  category: string
  severity: string
  outcome: string
  actor_user_id: string | null
  actor_name: string
  actor_email: string
  actor_role: string | null
  target_type: string
  target_label: string
  target_id: string | null
  ip_address: string
  user_agent: string | null
  source: 'PORTAL' | 'MOBILE' | 'SYSTEM'
  request_id: string | null
  reason: string | null
  changes: AuditLogChangeApiResponse[]
  metadata: Record<string, string>
  created_at: string
}

interface AuditLogPageApiResponse {
  items: AuditLogApiResponse[]
  total: number
  next_cursor: string | null
}

function mapApiEntry(data: AuditLogApiResponse): AuditLogEntry {
  return {
    id: data.audit_log_id,
    createdAt: data.created_at,
    action: data.action,
    description: data.description,
    category: CATEGORY_FROM_API[data.category] ?? 'system',
    severity: data.severity.toLowerCase() as AuditLogSeverity,
    outcome: data.outcome.toLowerCase() as AuditLogOutcome,
    actor: {
      // A system entry has no account behind it; the grid keys on the row id anyway.
      id: data.actor_user_id ?? '',
      name: data.actor_name,
      email: data.actor_email,
      role: data.actor_role?.toLowerCase() ?? '',
    },
    target: {
      type: data.target_type,
      label: data.target_label,
      id: data.target_id ?? undefined,
    },
    ipAddress: data.ip_address,
    userAgent: data.user_agent ?? '',
    requestId: data.request_id ?? '',
    source: data.source.toLowerCase() as AuditLogEntry['source'],
    changes: data.changes.map((change) => ({
      field: change.field,
      before: change.before ?? undefined,
      after: change.after ?? undefined,
    })),
    metadata: data.metadata,
    reason: data.reason ?? undefined,
  }
}

/**
 * One keyset page of the audit trail. Every filter narrows on the server, so the grid
 * never has to hold more than the pages actually scrolled.
 */
export async function listAuditLogs(query: AuditLogQuery = {}): Promise<AuditLogPage> {
  try {
    const search = query.search?.trim()

    const { data: body } = await apiClient.get<{
      ok: true
      data: AuditLogPageApiResponse
    }>('/api/v1/audit-logs', {
      params: {
        ...(search ? { search } : {}),
        category:
          query.category && query.category !== AUDIT_FILTER_ALL
            ? CATEGORY_TO_API[query.category]
            : AUDIT_FILTER_ALL,
        severity:
          query.severity && query.severity !== AUDIT_FILTER_ALL
            ? query.severity.toUpperCase()
            : AUDIT_FILTER_ALL,
        outcome:
          query.outcome && query.outcome !== AUDIT_FILTER_ALL
            ? query.outcome.toUpperCase()
            : AUDIT_FILTER_ALL,
        range: query.range ?? AUDIT_DEFAULT_RANGE,
        ...(query.cursor ? { cursor: query.cursor } : {}),
        limit: query.limit ?? AUDIT_PAGE_SIZE,
      },
    })

    return {
      success: true,
      list: body.data.items.map(mapApiEntry),
      total: body.data.total,
      nextCursor: body.data.next_cursor ?? undefined,
    }
  } catch (error) {
    return {
      success: false,
      message: parseApiError(error),
      list: [],
      total: 0,
    }
  }
}
