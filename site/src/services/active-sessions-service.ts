import {
  ACTIVE_SESSIONS_FILTER_ALL,
  ACTIVE_SESSIONS_PAGE_SIZE,
} from '../constants/active-sessions'
import type {
  ActiveSession,
  ActiveSessionsPage,
  ActiveSessionsQuery,
  RevokeSessionsResult,
  SessionRole,
  SessionSource,
} from '../types/active-session'
import { apiClient, parseApiError } from './api-client'

interface ActiveSessionApiResponse {
  session_id: string
  user_id: string
  email: string
  firstname: string | null
  lastname: string | null
  avatar: string | null
  department: string | null
  role_type: string
  is_restricted: boolean
  ip_address: string
  user_agent: string | null
  source: 'PORTAL' | 'MOBILE'
  created_at: string
  last_seen_at: string
  expires_at: string
  is_current: boolean
}

interface SessionsPageApiResponse {
  items: ActiveSessionApiResponse[]
  total: number
  next_cursor: string | null
}

function mapApiSession(data: ActiveSessionApiResponse): ActiveSession {
  return {
    id: data.session_id,
    userId: data.user_id,
    email: data.email,
    firstName: data.firstname ?? undefined,
    lastName: data.lastname ?? undefined,
    avatar: data.avatar ?? undefined,
    department: data.department ?? undefined,
    role: data.role_type.toLowerCase() as SessionRole,
    isRestricted: data.is_restricted,
    ipAddress: data.ip_address,
    userAgent: data.user_agent ?? undefined,
    source: data.source.toLowerCase() as SessionSource,
    signedInAt: data.created_at,
    lastSeenAt: data.last_seen_at,
    expiresAt: data.expires_at,
    isCurrent: data.is_current,
  }
}

/**
 * One keyset page of signed-in devices. Every filter narrows on the server, so the
 * grid never has to hold more than the pages actually scrolled.
 */
export async function listActiveSessions(
  query: ActiveSessionsQuery = {},
): Promise<ActiveSessionsPage> {
  try {
    const search = query.search?.trim()

    const { data: body } = await apiClient.get<{
      ok: true
      data: SessionsPageApiResponse
    }>('/api/v1/sessions', {
      params: {
        ...(search ? { search } : {}),
        source:
          query.source && query.source !== ACTIVE_SESSIONS_FILTER_ALL
            ? query.source.toUpperCase()
            : ACTIVE_SESSIONS_FILTER_ALL,
        role:
          query.role && query.role !== ACTIVE_SESSIONS_FILTER_ALL
            ? query.role.toUpperCase()
            : ACTIVE_SESSIONS_FILTER_ALL,
        ...(query.cursor ? { cursor: query.cursor } : {}),
        limit: query.limit ?? ACTIVE_SESSIONS_PAGE_SIZE,
      },
    })

    return {
      success: true,
      list: body.data.items.map(mapApiSession),
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

/** Ends one device. The token stops working on that device's next request. */
export async function revokeSession(
  sessionId: string,
): Promise<RevokeSessionsResult> {
  try {
    const { data: body } = await apiClient.delete<{
      ok: true
      data: { revoked: number }
    }>(`/api/v1/sessions/${sessionId}`)

    return { success: true, revoked: body.data.revoked }
  } catch (error) {
    return { success: false, message: parseApiError(error), revoked: 0 }
  }
}

/**
 * Ends every device of one account. `keepCurrent` spares the calling browser, which is
 * what an admin clearing their own other devices wants.
 */
export async function revokeUserSessions(
  userId: string,
  keepCurrent = false,
): Promise<RevokeSessionsResult> {
  try {
    const { data: body } = await apiClient.delete<{
      ok: true
      data: { revoked: number }
    }>(`/api/v1/sessions/users/${userId}`, {
      params: { keep_current: keepCurrent },
    })

    return { success: true, revoked: body.data.revoked }
  } catch (error) {
    return { success: false, message: parseApiError(error), revoked: 0 }
  }
}
