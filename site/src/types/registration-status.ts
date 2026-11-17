/** Where a reviewed mobile sign-up stands, as `GET /api/v1/auth/registration-status` returns it. */
export type RegistrationReviewStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export interface RegistrationStatus {
  reference: string
  /** What was registered, e.g. "beneficiary" or "manual volunteer". */
  registration_label: string
  firstname: string
  status: RegistrationReviewStatus
  rejection_reason: string | null
  submitted_at: string
  decided_at: string | null
}
