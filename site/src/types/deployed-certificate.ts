import type {
  CertificateDesign,
  CertificateOrientation,
  CertificateTemplateCategory,
} from './certificate-template'

export type DeploymentStatus = 'distributing' | 'scheduled' | 'paused' | 'completed'

export interface DeploymentEvent {
  id: string
  name: string
  venue: string
  date: string
}

/** Carries its frozen design so the sheet draws as signed off, even if the template changed. */
export interface DeployedCertificate {
  id: string
  /** e.g. `DC-2026-014`. */
  reference: string
  templateId: string
  templateName: string
  category: CertificateTemplateCategory
  orientation: CertificateOrientation
  design: CertificateDesign
  event: DeploymentEvent
  status: DeploymentStatus
  /** The denominator for the counts below. */
  participants: number
  distributed: number
  /** Of the distributed sheets, how many were opened. */
  claimed: number
  deployedAt: string
  deployedBy: string
}

export interface DeployedCertificateCounts {
  deployments: number
  /** Distinct events; a template may be deployed to several. */
  events: number
  participants: number
  distributed: number
  /** `participants - distributed`, floored at zero. */
  pending: number
  claimed: number
  byStatus: Record<DeploymentStatus, number>
}

export interface CertificateRecipient {
  id: string
  /** e.g. `CERT-2026-000123`. */
  certificateNumber: string
  userId: string
  name: string
  hoursRendered: number
  issuedAt: string
  /** Null until first opened in the app. */
  claimedAt: string | null
}
