/** Filed from the mobile app. Registration kinds can't sign in until approved; rejecting `event_role` keeps them as Regular. */
export type UserRequestKind =
  | 'role_access'
  | 'event_join'
  | 'beneficiary_registration'
  | 'event_role'
  | 'residency_verification'
  | 'alumni_registration'
  | 'partner_barangay_registration'
  | 'manual_registration'

/** Approving one lets the new account sign in. */
export function isRegistrationRequest(kind: UserRequestKind): boolean {
  return (
    kind === 'beneficiary_registration' ||
    kind === 'alumni_registration' ||
    kind === 'partner_barangay_registration' ||
    kind === 'manual_registration'
  )
}

/** `deleted` is a restorable recycle bin; `rejected` is shown to the beneficiary, who may re-apply. */
export type UserRequestStatus = 'pending' | 'accepted' | 'deleted' | 'rejected'

export type UserRequestAttachmentKind =
  | 'id-front'
  | 'id-back'
  | 'selfie'
  | 'residency-proof'
  | 'supporting-document'

export interface UserRequestAttachment {
  kind: UserRequestAttachmentKind
  /** e.g. `Valid ID (front)`. */
  label: string
  /** Streamed through the API behind the bearer token. */
  path: string
  /** Set when the file may not be an image. */
  contentType?: string
  fileName?: string
  sizeBytes?: number
}

export interface UserRequestEvent {
  id: string
  label: string
  /** Requester for the submission, a portal account after. */
  actor: string
  at: string
}

export interface UserRequestSubmitter {
  name: string
  email: string
  role: string
  barangay: string | null
  phone: string
  address: string
}

export interface UserRequestEventTarget {
  id: number
  title: string
  startsAt: string
}

export interface UserRequest {
  id: string
  /** e.g. `REQ-007`. */
  reference: string
  kind: UserRequestKind
  status: UserRequestStatus
  submitter: UserRequestSubmitter
  summary: string
  /** `role_access` only. */
  requestedRole?: string
  /** `event_role` only, e.g. `Organizer`. */
  participationRole?: string
  /** `event_join` / `event_role` only. */
  event?: UserRequestEventTarget
  /** `role_access` only: selfie-to-ID similarity, 0–1. */
  faceSimilarity?: number
  submittedAt: string
  /** Cleared again on restore. */
  decidedAt?: string
  decidedBy?: string
  /** `rejected` only; shown to the beneficiary. */
  rejectionReason?: string
  attachments: UserRequestAttachment[]
  trail: UserRequestEvent[]
}
