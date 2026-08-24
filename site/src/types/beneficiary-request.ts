/**
 * Beneficiary requests are filed from the volunteer app: a household asks to be
 * registered as a CARES beneficiary and attaches the proof that backs the claim.
 * The director reviews the queue and either accepts the request or drops it.
 */
export type BeneficiaryRequestType =
  | 'verification_proof'
  | 'residency_proof'
  | 'income_proof'
  | 'medical_assistance'
  | 'household_update'

/**
 * `deleted` is a recycle bin, not a hard delete — the director can restore a request
 * back into the queue, which is why a dropped row keeps its whole trail.
 */
export type BeneficiaryRequestStatus = 'pending' | 'accepted' | 'deleted'

export interface BeneficiaryRequestAttachment {
  id: string
  /** What the file is meant to prove, e.g. `Barangay certificate`. */
  label: string
  fileName: string
  sizeBytes: number
}

/** One entry on the request's timeline — submitted, reviewed, accepted, restored. */
export interface BeneficiaryRequestEvent {
  id: string
  label: string
  /** Who caused it; the volunteer for the submission, a portal account after that. */
  actor: string
  at: string
}

export interface BeneficiaryRequestSubmitter {
  name: string
  email: string
  barangay: string
}

export interface BeneficiaryRequest {
  id: string
  /** Sequential tracking number — 7th request filed is `REQ-007`. */
  reference: string
  type: BeneficiaryRequestType
  status: BeneficiaryRequestStatus
  submitter: BeneficiaryRequestSubmitter
  /** One-line statement of what is being asked for. */
  summary: string
  submittedAt: string
  /** Set once the request leaves `pending`; cleared again on restore. */
  decidedAt?: string
  decidedBy?: string
  attachments: BeneficiaryRequestAttachment[]
  trail: BeneficiaryRequestEvent[]
}

export interface BeneficiaryRequestCounts {
  pending: number
  accepted: number
  deleted: number
}
