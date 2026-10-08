import type {
  AssistanceCategory,
  AssistanceDecision,
  AssistanceRequest,
  AssistanceRequestStage,
  AssistanceRequestStatus,
  AssistanceUrgency,
} from '../types/assistance-request'
import { apiClient, parseApiError } from './api-client'

/** Backend wraps successful responses in an { ok, data } envelope. */
type ApiEnvelope<T> = { ok: true; message?: string; data: T }

const ASSISTANCE_REQUESTS_URL = '/api/v1/assistance-requests'

interface AssistanceRequestApiResponse {
  assistance_request_id: string
  reference_number: number
  reference_label: string
  requester_id: string
  requester_firstname: string
  requester_lastname: string
  requester_email: string
  requester_role_type: string
  requester_barangay: string | null
  title: string
  category: Uppercase<AssistanceCategory>
  description: string
  urgency: Uppercase<AssistanceUrgency>
  household_size: number
  location_latitude: number | null
  location_longitude: number | null
  location_details: string | null
  status: Uppercase<AssistanceRequestStatus>
  status_note: string | null
  attachments: {
    assistance_request_attachment_id: string
    name: string
    mime: string
    size_bytes: number
  }[]
  screened_at: string | null
  decided_at: string | null
  released_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
}

interface AssistanceRequestListApiResponse {
  items: AssistanceRequestApiResponse[]
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

/** The trail the server's stage stamps describe, oldest first. */
function stagesOf(data: AssistanceRequestApiResponse): AssistanceRequestStage[] {
  const decision = data.status === 'DECLINED' ? 'Declined' : 'Approved'
  const stages: (AssistanceRequestStage | null)[] = [
    { label: 'Submitted', at: data.created_at },
    data.screened_at ? { label: 'Screening started', at: data.screened_at } : null,
    data.decided_at ? { label: decision, at: data.decided_at } : null,
    data.released_at ? { label: 'Assistance released', at: data.released_at } : null,
    data.cancelled_at ? { label: 'Cancelled by the beneficiary', at: data.cancelled_at } : null,
  ]
  return stages
    .filter((stage): stage is AssistanceRequestStage => stage !== null)
    .sort((a, b) => a.at.localeCompare(b.at))
}

function mapRequest(data: AssistanceRequestApiResponse): AssistanceRequest {
  const hasPin = data.location_latitude !== null && data.location_longitude !== null
  return {
    id: data.assistance_request_id,
    reference: data.reference_label,
    status: data.status.toLowerCase() as AssistanceRequestStatus,
    requester: {
      name: `${data.requester_firstname} ${data.requester_lastname}`.trim(),
      email: data.requester_email,
      role: titleCase(data.requester_role_type),
      barangay: data.requester_barangay,
    },
    title: data.title,
    category: data.category.toLowerCase() as AssistanceCategory,
    urgency: data.urgency.toLowerCase() as AssistanceUrgency,
    description: data.description,
    householdSize: data.household_size,
    location: hasPin
      ? {
          latitude: data.location_latitude as number,
          longitude: data.location_longitude as number,
          details: data.location_details ?? undefined,
        }
      : undefined,
    statusNote: data.status_note ?? undefined,
    cancelReason: data.cancel_reason ?? undefined,
    attachments: data.attachments.map((file) => ({
      id: file.assistance_request_attachment_id,
      label: file.name,
      path: `${ASSISTANCE_REQUESTS_URL}/${data.assistance_request_id}/attachments/${file.assistance_request_attachment_id}`,
      contentType: file.mime,
      sizeBytes: file.size_bytes,
    })),
    stages: stagesOf(data),
    submittedAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/** Every request in one read — the portal groups and filters client-side. */
export async function fetchAssistanceRequests(): Promise<AssistanceRequest[]> {
  try {
    const { data: body } =
      await apiClient.get<ApiEnvelope<AssistanceRequestListApiResponse>>(ASSISTANCE_REQUESTS_URL)
    return body.data.items.map(mapRequest)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

/**
 * Every move returns the updated request, so the store swaps one row in place.
 * `note` is the approval note (optional) or the decline reason (required).
 */
export async function decideAssistanceRequest(
  id: string,
  decision: AssistanceDecision,
  note?: string,
): Promise<AssistanceRequest> {
  const body =
    decision === 'approve' ? { note: note || null } : decision === 'decline' ? { reason: note } : {}
  try {
    const { data: response } = await apiClient.post<ApiEnvelope<AssistanceRequestApiResponse>>(
      `${ASSISTANCE_REQUESTS_URL}/${id}/${decision}`,
      body,
    )
    return mapRequest(response.data)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}
