/** pending → under_review → approved → completed, or declined; the beneficiary may cancel until completed. */
export type AssistanceRequestStatus =
  'pending' | 'under_review' | 'approved' | 'completed' | 'declined' | 'cancelled'

export type AssistanceCategory =
  'food' | 'medical' | 'education' | 'financial' | 'livelihood' | 'disaster_relief'

export type AssistanceUrgency = 'low' | 'normal' | 'high' | 'urgent'

export interface AssistanceRequestAttachment {
  id: string
  label: string
  /** Streamed through the API behind the bearer token. */
  path: string
  contentType?: string
  sizeBytes: number
}

export interface AssistanceRequestLocation {
  latitude: number
  longitude: number
  details?: string
}

export interface AssistanceRequestStage {
  label: string
  at: string
}

export interface AssistanceRequest {
  id: string
  /** e.g. `CARES-AR-2026-0007`, as the beneficiary sees it. */
  reference: string
  status: AssistanceRequestStatus
  requester: {
    name: string
    email: string
    role: string
    barangay: string | null
  }
  title: string
  category: AssistanceCategory
  urgency: AssistanceUrgency
  description: string
  householdSize: number
  location?: AssistanceRequestLocation
  /** Approval note or decline reason. */
  statusNote?: string
  cancelReason?: string
  attachments: AssistanceRequestAttachment[]
  stages: AssistanceRequestStage[]
  submittedAt: string
  updatedAt: string
}

export type AssistanceDecision = 'review' | 'approve' | 'decline' | 'complete'
