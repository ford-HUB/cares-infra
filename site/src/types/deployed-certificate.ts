import type {
  CertificateDesign,
  CertificateOrientation,
  CertificateTemplateCategory,
} from './certificate-template'

/**
 * Where a deployment sits in its own life: it is queued for an event that has not
 * finished, handing sheets out, paused by a director, or done.
 */
export type DeploymentStatus = 'distributing' | 'scheduled' | 'paused' | 'completed'

/** The event a template was deployed to — the slice this screen needs, not the whole record. */
export interface DeploymentEvent {
  id: string
  name: string
  venue: string
  /** Day the event ran; a scheduled deployment points at a future one. */
  date: string
}

/**
 * One customized template deployed to one event. The design travels with the record
 * so the page can draw the sheet exactly as it was signed off in Customization,
 * without re-reading the template it came from (which may have moved on since).
 */
export interface DeployedCertificate {
  id: string
  /** Human reference for the deployment itself, e.g. `DC-2026-014`. */
  reference: string
  templateId: string
  templateName: string
  category: CertificateTemplateCategory
  orientation: CertificateOrientation
  design: CertificateDesign
  event: DeploymentEvent
  status: DeploymentStatus
  /** Participants the deployment covers — the denominator for everything below. */
  participants: number
  /** Certificates generated and released to a participant. */
  distributed: number
  /** Of the distributed sheets, how many the recipient actually opened. */
  claimed: number
  deployedAt: string
  deployedBy: string
}

/** Page-level tallies: the participant whole, plus the deployment/event counts. */
export interface DeployedCertificateCounts {
  /** Deployment records, whatever their status. */
  deployments: number
  /** Distinct events covered — a template may be deployed to several. */
  events: number
  participants: number
  distributed: number
  /** `participants - distributed`, floored at zero. */
  pending: number
  claimed: number
  /** Deployments per status, so the summary bar and the filter cannot drift. */
  byStatus: Record<DeploymentStatus, number>
}
