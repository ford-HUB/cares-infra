import { formatRequestReference } from '../constants/user-requests'
import type {
  UserRequest,
  UserRequestAttachmentKind,
  UserRequestKind,
  UserRequestStatus,
} from '../types/user-request'
import { apiClient, parseApiError } from './api-client'

/** Backend wraps successful responses in an { ok, data } envelope. */
type ApiEnvelope<T> = { ok: true; message?: string; data: T }

const USER_REQUESTS_URL = '/api/v1/user-requests'

interface UserRequestTrailApiResponse {
  user_request_trail_entry_id: string
  label: string
  actor_name: string
  created_at: string
}

interface UserRequestApiResponse {
  user_request_id: string
  reference_number: number
  kind: 'ROLE_ACCESS' | 'EVENT_JOIN'
  status: 'PENDING' | 'ACCEPTED' | 'DELETED'
  requester_id: string
  requester_firstname: string
  requester_lastname: string
  requester_email: string
  requester_role_type: string
  requester_barangay: string | null
  requested_role: string | null
  event_id: number | null
  event_title: string | null
  event_started: string | null
  summary: string
  face_similarity: number | null
  attachments: {
    kind: UserRequestAttachmentKind
    label: string
    content_type: string | null
  }[]
  decided_by_name: string | null
  decided_at: string | null
  trail: UserRequestTrailApiResponse[]
  created_at: string
  updated_at: string
}

interface UserRequestListApiResponse {
  items: UserRequestApiResponse[]
  total: number
}

/** Server enums are SCREAMING_SNAKE; the portal's own vocabulary is snake_case. */
const KIND_MAP: Record<UserRequestApiResponse['kind'], UserRequestKind> = {
  ROLE_ACCESS: 'role_access',
  EVENT_JOIN: 'event_join',
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

function mapRequest(data: UserRequestApiResponse): UserRequest {
  return {
    id: data.user_request_id,
    reference: formatRequestReference(data.reference_number),
    kind: KIND_MAP[data.kind],
    status: data.status.toLowerCase() as UserRequestStatus,
    submitter: {
      name: `${data.requester_firstname} ${data.requester_lastname}`.trim(),
      email: data.requester_email,
      role: titleCase(data.requester_role_type),
      barangay: data.requester_barangay,
    },
    summary: data.summary,
    requestedRole: data.requested_role ? titleCase(data.requested_role) : undefined,
    event:
      data.event_id !== null && data.event_title !== null && data.event_started !== null
        ? { id: data.event_id, title: data.event_title, startsAt: data.event_started }
        : undefined,
    faceSimilarity: data.face_similarity ?? undefined,
    submittedAt: data.created_at,
    decidedAt: data.decided_at ?? undefined,
    decidedBy: data.decided_by_name ?? undefined,
    attachments: data.attachments.map((attachment) => ({
      kind: attachment.kind,
      label: attachment.label,
      path: `${USER_REQUESTS_URL}/${data.user_request_id}/attachments/${attachment.kind}`,
      contentType: attachment.content_type ?? undefined,
    })),
    trail: data.trail.map((entry) => ({
      id: entry.user_request_trail_entry_id,
      label: entry.label,
      actor: entry.actor_name,
      at: entry.created_at,
    })),
  }
}

/** The whole queue in one read — the portal groups by day client-side. */
export async function fetchUserRequests(): Promise<UserRequest[]> {
  try {
    const { data: body } = await apiClient.get<ApiEnvelope<UserRequestListApiResponse>>(
      USER_REQUESTS_URL,
    )
    return body.data.items.map(mapRequest)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

async function decide(id: string, action: 'accept' | 'remove' | 'restore'): Promise<UserRequest> {
  try {
    const { data: body } = await apiClient.post<ApiEnvelope<UserRequestApiResponse>>(
      `${USER_REQUESTS_URL}/${id}/${action}`,
    )
    return mapRequest(body.data)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

/** Every decision returns the updated request, so the store swaps one row in place. */
export const acceptUserRequest = (id: string) => decide(id, 'accept')
export const deleteUserRequest = (id: string) => decide(id, 'remove')
export const restoreUserRequest = (id: string) => decide(id, 'restore')
