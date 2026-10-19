/**
 * User requests are filed from the mobile app and ruled on here:
 * - `role_access` — a donor or beneficiary who passed the ID + face check and asks
 *   for the Volunteer side of their account to be opened.
 * - `event_join` — a beneficiary asking for a place on an event; accepting is what
 *   books the slot.
 * - `beneficiary_registration` — a new beneficiary account that cannot sign in
 *   until a director approves it; it carries the supporting document from sign-up.
 * - `event_role` — a volunteer registered for an event as Organizer, Facilitator
 *   or Speaker. No proof is attached: the reviewer decides on what they know of
 *   the volunteer. Rejecting keeps the registration; they take part as Regular.
 */
export type UserRequestKind =
  | 'role_access'
  | 'event_join'
  | 'beneficiary_registration'
  | 'event_role'

/**
 * `deleted` is a recycle bin, not a hard delete — the director can restore a request
 * back into the queue, which is why a dropped row keeps its whole trail.
 * `rejected` is a decision the beneficiary sees, with the director's reason; they
 * can apply again for the same event, which files a new request.
 */
export type UserRequestStatus = 'pending' | 'accepted' | 'deleted' | 'rejected'

export type UserRequestAttachmentKind =
  | 'id-front'
  | 'id-back'
  | 'selfie'
  | 'residency-proof'
  | 'supporting-document'

export interface UserRequestAttachment {
  kind: UserRequestAttachmentKind
  /** What the file is meant to prove, e.g. `Valid ID (front)`. */
  label: string
  /** API path the portal streams the file from behind the bearer token. */
  path: string
  /** Set when the file may not be an image — a PDF, or a document of any type. */
  contentType?: string
  /** The uploaded file's own name, kept for downloads. */
  fileName?: string
  sizeBytes?: number
}

/** One entry on the request's timeline — submitted, accepted, removed, restored. */
export interface UserRequestEvent {
  id: string
  label: string
  /** Who caused it; the requester for the submission, a portal account after that. */
  actor: string
  at: string
}

export interface UserRequestSubmitter {
  name: string
  email: string
  /** The role the account registered with — the side the request comes from. */
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
  /** Sequential tracking number — 7th request filed is `REQ-007`. */
  reference: string
  kind: UserRequestKind
  status: UserRequestStatus
  submitter: UserRequestSubmitter
  /** One-line statement of what is being asked for. */
  summary: string
  /** `role_access` only — the role label being asked for. */
  requestedRole?: string
  /** `event_role` only — the event role label being asked for, e.g. `Organizer`. */
  participationRole?: string
  /** `event_join` / `event_role` — the event the request is about. */
  event?: UserRequestEventTarget
  /** `role_access` only — how closely the selfie matched the ID photo, 0–1. */
  faceSimilarity?: number
  submittedAt: string
  /** Set once the request leaves `pending`; cleared again on restore. */
  decidedAt?: string
  decidedBy?: string
  /** `rejected` only — the reason the director gave, shown to the beneficiary. */
  rejectionReason?: string
  attachments: UserRequestAttachment[]
  trail: UserRequestEvent[]
}
