/**
 * A beneficiary's request for assistance (food, medical, financial, …), filed from
 * the mobile app and worked through by the relief desk here:
 * pending → under_review → approved → completed, or declined at review. The
 * beneficiary may cancel it themselves until it is completed.
 */
export type AssistanceRequestStatus =
  'pending' | 'under_review' | 'approved' | 'completed' | 'declined' | 'cancelled'

export type AssistanceCategory =
  'food' | 'medical' | 'education' | 'financial' | 'livelihood' | 'disaster_relief'

export type AssistanceUrgency = 'low' | 'normal' | 'high' | 'urgent'

export interface AssistanceRequestAttachment {
  id: string
  label: string
  /** API path the portal streams the file from behind the bearer token. */
  path: string
  contentType?: string
  sizeBytes: number
}

/** Where the beneficiary pinned the need on the app's map. */
export interface AssistanceRequestLocation {
  latitude: number
  longitude: number
  /** Landmark or address details typed beside the pin. */
  details?: string
}

/** One stage of the request, derived from the stamps the server keeps. */
export interface AssistanceRequestStage {
  label: string
  at: string
}

export interface AssistanceRequest {
  id: string
  /** `CARES-AR-2026-0007`, the same label the beneficiary sees. */
  reference: string
  status: AssistanceRequestStatus
  requester: {
    name: string
    email: string
    role: string
    barangay: string | null
  }
  /** What is needed — the picked option or what the beneficiary typed. */
  title: string
  category: AssistanceCategory
  urgency: AssistanceUrgency
  description: string
  householdSize: number
  location?: AssistanceRequestLocation
  /** The approval note or the decline reason. */
  statusNote?: string
  cancelReason?: string
  attachments: AssistanceRequestAttachment[]
  stages: AssistanceRequestStage[]
  submittedAt: string
  updatedAt: string
}

/** The relief desk's moves on a request. */
export type AssistanceDecision = 'review' | 'approve' | 'decline' | 'complete'
