import { DEPLOYMENT_STATUS_ORDER } from '../../constants/deployed-certificates'
import type {
  CertificateDesign,
  CertificateSignatory,
  CertificateTemplateCategory,
  CertificateOrientation,
} from '../../types/certificate-template'
import type {
  DeployedCertificate,
  DeployedCertificateCounts,
  DeploymentStatus,
} from '../../types/deployed-certificate'
import { apiClient, parseApiError } from '../api-client'
import { resolveDesignAssets } from './certificate-asset-cache'

const DEPLOYMENTS_URL = '/api/v1/certificate-deployments'

interface DeployedSignatoryApi {
  id: string
  coordinator_id: string
  name: string
  title: string
  department: string
  signature_token: string
  has_signature: boolean
}

interface DeployedDesignApi {
  accent: CertificateDesign['accent']
  frame: CertificateDesign['frame']
  frame_svg_url?: string
  frame_svg_name?: string
  layout: CertificateDesign['layout']
  font: NonNullable<CertificateDesign['font']>
  element_fonts: NonNullable<CertificateDesign['elementFonts']>
  element_sizes: NonNullable<CertificateDesign['elementSizes']>
  element_widths: NonNullable<CertificateDesign['elementWidths']>
  element_heights: NonNullable<CertificateDesign['elementHeights']>
  element_aligns: NonNullable<CertificateDesign['elementAligns']>
  headline: string
  body: string
  show_seal: boolean
  seal_label: string
  seal_style?: CertificateDesign['sealStyle']
  seal_accent?: CertificateDesign['sealAccent']
  seal_svg_url?: string
  seal_svg_name?: string
  images: CertificateDesign['images']
  signatories: DeployedSignatoryApi[]
}

interface DeployedCertificateApi {
  id: string
  reference: string
  template_id: string
  template_name: string
  category: CertificateTemplateCategory
  orientation: CertificateOrientation
  design: DeployedDesignApi
  event: { id: string; name: string; venue: string; date: string }
  status: DeploymentStatus
  participants: number
  distributed: number
  claimed: number
  deployed_at: string
  deployed_by: string
}

function mapSignatory(signatory: DeployedSignatoryApi): CertificateSignatory {
  return {
    id: signatory.id,
    coordinatorId: signatory.coordinator_id,
    name: signatory.name,
    title: signatory.title,
    department: signatory.department,
    signatureToken: signatory.signature_token,
    hasSignature: signatory.has_signature,
  }
}

function mapDesign(design: DeployedDesignApi): CertificateDesign {
  return {
    accent: design.accent,
    frame: design.frame,
    frameSvgUrl: design.frame_svg_url,
    frameSvgName: design.frame_svg_name,
    layout: design.layout,
    font: design.font,
    elementFonts: design.element_fonts,
    elementSizes: design.element_sizes,
    elementWidths: design.element_widths,
    elementHeights: design.element_heights,
    elementAligns: design.element_aligns,
    headline: design.headline,
    body: design.body,
    showSeal: design.show_seal,
    sealLabel: design.seal_label,
    sealStyle: design.seal_style,
    sealAccent: design.seal_accent,
    sealSvgUrl: design.seal_svg_url,
    sealSvgName: design.seal_svg_name,
    images: design.images,
    signatories: design.signatories.map(mapSignatory),
  }
}

/**
 * The frozen design still points at the artwork of the template it was cut from, so it
 * goes through the same private-bucket resolver the templates page uses.
 */
async function mapDeployment(
  deployment: DeployedCertificateApi,
): Promise<DeployedCertificate> {
  return {
    id: deployment.id,
    reference: deployment.reference,
    templateId: deployment.template_id,
    templateName: deployment.template_name,
    category: deployment.category,
    orientation: deployment.orientation,
    design: await resolveDesignAssets(mapDesign(deployment.design)),
    event: deployment.event,
    status: deployment.status,
    participants: deployment.participants,
    distributed: deployment.distributed,
    claimed: deployment.claimed,
    deployedAt: deployment.deployed_at,
    deployedBy: deployment.deployed_by,
  }
}

export async function listDeployedCertificates(): Promise<DeployedCertificate[]> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: DeployedCertificateApi[]
    }>(DEPLOYMENTS_URL)

    return Promise.all(body.data.map(mapDeployment))
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

/**
 * Puts a published template onto an event. Deploying the same pair again re-cuts the
 * existing record with the current design, which the server refuses once sheets have
 * gone out.
 */
export async function deployCertificateTemplate(
  templateId: string,
  eventId: number,
): Promise<DeployedCertificate> {
  try {
    const { data: body } = await apiClient.post<{
      ok: true
      data: DeployedCertificateApi
    }>(DEPLOYMENTS_URL, {
      certificate_template_id: templateId,
      event_id: eventId,
    })

    return mapDeployment(body.data)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

/** Holding a deployment or letting it run again — `scheduled` is not settable by hand. */
export async function updateDeploymentStatus(
  id: string,
  status: Exclude<DeploymentStatus, 'scheduled'>,
): Promise<DeployedCertificate> {
  try {
    const { data: body } = await apiClient.patch<{
      ok: true
      data: DeployedCertificateApi
    }>(`${DEPLOYMENTS_URL}/${id}/status`, { status })

    return mapDeployment(body.data)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

/** Distributed and pending are parts of `participants`; events is a distinct count. */
export function countDeployedCertificates(
  deployments: DeployedCertificate[],
): DeployedCertificateCounts {
  const byStatus = DEPLOYMENT_STATUS_ORDER.reduce(
    (all, status) => ({ ...all, [status]: 0 }),
    {} as Record<DeploymentStatus, number>,
  )

  const events = new Set<string>()
  let participants = 0
  let distributed = 0
  let claimed = 0

  for (const one of deployments) {
    byStatus[one.status] += 1
    events.add(one.event.id)
    participants += one.participants
    distributed += one.distributed
    claimed += one.claimed
  }

  return {
    deployments: deployments.length,
    events: events.size,
    participants,
    distributed,
    pending: Math.max(participants - distributed, 0),
    claimed,
    byStatus,
  }
}

/** Share of a deployment's participants that already hold their certificate. */
export function distributionShare(deployment: DeployedCertificate): number {
  return deployment.participants > 0
    ? deployment.distributed / deployment.participants
    : 0
}
