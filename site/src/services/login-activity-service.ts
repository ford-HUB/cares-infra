import {
  LOGIN_ACTIVITY_DEFAULT_RANGE,
  LOGIN_ACTIVITY_FILTER_ALL,
  LOGIN_ACTIVITY_PAGE_SIZE,
} from '../constants/login-activity'
import type {
  LoginActivityEntry,
  LoginActivityPage,
  LoginActivityQuery,
  LoginOutcome,
  LoginSource,
} from '../types/login-activity'
import { apiClient, parseApiError } from './api-client'

/** Server enums are SCREAMING_SNAKE; the portal's own vocabulary is kebab-case. */
const OUTCOME_FROM_API: Record<string, LoginOutcome> = {
  SUCCESS: 'success',
  INVALID_CREDENTIALS: 'invalid-credentials',
  BLOCKED_IP: 'blocked-ip',
  RESTRICTED_ACCOUNT: 'restricted-account',
  ROLE_NOT_ALLOWED: 'role-not-allowed',
  LOCKED_OUT: 'locked-out',
  OUTSIDE_LOGIN_HOURS: 'outside-login-hours',
  IP_NOT_ALLOWED: 'ip-not-allowed',
  CREDENTIAL_EXPIRED: 'credential-expired',
}

const OUTCOME_TO_API: Record<LoginOutcome, string> = {
  success: 'SUCCESS',
  'invalid-credentials': 'INVALID_CREDENTIALS',
  'blocked-ip': 'BLOCKED_IP',
  'restricted-account': 'RESTRICTED_ACCOUNT',
  'role-not-allowed': 'ROLE_NOT_ALLOWED',
  'locked-out': 'LOCKED_OUT',
  'outside-login-hours': 'OUTSIDE_LOGIN_HOURS',
  'ip-not-allowed': 'IP_NOT_ALLOWED',
  'credential-expired': 'CREDENTIAL_EXPIRED',
}

interface LoginActivityApiResponse {
  login_activity_id: string
  user_id: string | null
  email: string
  firstname: string | null
  lastname: string | null
  role_type: string | null
  ip_address: string
  user_agent: string | null
  source: 'PORTAL' | 'MOBILE'
  outcome: string
  failure_reason: string | null
  created_at: string
}

interface LoginActivityPageApiResponse {
  items: LoginActivityApiResponse[]
  total: number
  next_cursor: string | null
}

function mapApiEntry(data: LoginActivityApiResponse): LoginActivityEntry {
  return {
    id: data.login_activity_id,
    userId: data.user_id ?? undefined,
    email: data.email,
    firstName: data.firstname ?? undefined,
    lastName: data.lastname ?? undefined,
    role: data.role_type?.toLowerCase(),
    ipAddress: data.ip_address,
    userAgent: data.user_agent ?? undefined,
    source: data.source.toLowerCase() as LoginSource,
    outcome: OUTCOME_FROM_API[data.outcome] ?? 'invalid-credentials',
    failureReason: data.failure_reason ?? undefined,
    createdAt: data.created_at,
  }
}

/**
 * One keyset page of the sign-in trail. Every filter narrows on the server, so the
 * grid never has to hold more than the pages actually scrolled.
 */
export async function listLoginActivity(
  query: LoginActivityQuery = {},
): Promise<LoginActivityPage> {
  try {
    const search = query.search?.trim()

    const { data: body } = await apiClient.get<{
      ok: true
      data: LoginActivityPageApiResponse
    }>('/api/v1/login-activity', {
      params: {
        ...(search ? { search } : {}),
        outcome:
          query.outcome && query.outcome !== LOGIN_ACTIVITY_FILTER_ALL
            ? OUTCOME_TO_API[query.outcome]
            : LOGIN_ACTIVITY_FILTER_ALL,
        source:
          query.source && query.source !== LOGIN_ACTIVITY_FILTER_ALL
            ? query.source.toUpperCase()
            : LOGIN_ACTIVITY_FILTER_ALL,
        range: query.range ?? LOGIN_ACTIVITY_DEFAULT_RANGE,
        ...(query.cursor ? { cursor: query.cursor } : {}),
        limit: query.limit ?? LOGIN_ACTIVITY_PAGE_SIZE,
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
