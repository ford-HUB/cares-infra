import type {
  CertificateDesign,
  CertificateSignatory,
  CertificateTemplate,
  CertificateTemplateCategory,
  CertificateTemplateCounts,
  CertificateTemplateInput,
  CertificateTemplateStatus,
  NewCertificateTemplateInput,
  SignatoryCoordinator,
} from '../../types/certificate-template'
import type { CertificateOrientation } from '../../types/certificate-template'
import { apiClient, parseApiError } from '../api-client'
import { resolveDesignAssets, toStoredDesignAssets } from './certificate-asset-cache'

const TEMPLATES_URL = '/api/v1/certificate-templates'

interface CertificateDesignApi {
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
  images: {
    id: string
    url: string
    name: string
    x: number
    y: number
    width: number
    height: number
    shape: CertificateDesign['images'][number]['shape']
    z: number
  }[]
}

interface CertificateSignatoryApi {
  id: string
  coordinator_id: string
  name: string
  title: string
  department: string
  signature_token: string
  has_signature: boolean
}

interface CertificateTemplateApi {
  id: string
  reference: string
  name: string
  description: string
  category: CertificateTemplateCategory
  status: CertificateTemplateStatus
  orientation: CertificateOrientation
  issued: number
  deployed_events: number
  design: CertificateDesignApi
  signatories: CertificateSignatoryApi[]
  updated_at: string
  updated_by: string
}

interface SignatoryCoordinatorApi {
  id: string
  name: string
  title: string
  department: string
  email: string
  has_signature: boolean
}

function mapSignatory(signatory: CertificateSignatoryApi): CertificateSignatory {
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

function mapDesign(
  design: CertificateDesignApi,
  signatories: CertificateSignatoryApi[],
): CertificateDesign {
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
    // The signature lines are their own rows on the server — they are joined back into
    // the design here because that is the shape the sheet is drawn from.
    signatories: signatories.map(mapSignatory),
  }
}

async function mapTemplate(
  template: CertificateTemplateApi,
): Promise<CertificateTemplate> {
  return {
    id: template.id,
    reference: template.reference,
    name: template.name,
    description: template.description,
    category: template.category,
    status: template.status,
    orientation: template.orientation,
    issued: template.issued,
    deployedEvents: template.deployed_events,
    design: await resolveDesignAssets(mapDesign(template.design, template.signatories)),
    updatedAt: template.updated_at,
    updatedBy: template.updated_by,
  }
}

/**
 * A save sends the whole template: the customizer edits wording, artwork and the people
 * signing it as one sheet. Signatories go up as accounts only — the server re-reads the
 * printed name and title from the directory, so the name over a coordinator's signature
 * is always that coordinator's own.
 */
function toSavePayload(input: CertificateTemplateInput) {
  const design = toStoredDesignAssets(input.design)

  return {
    name: input.name,
    description: input.description,
    category: input.category,
    status: input.status,
    orientation: input.orientation,
    design: {
      accent: design.accent,
      frame: design.frame,
      frame_svg_url: design.frameSvgUrl,
      frame_svg_name: design.frameSvgName,
      layout: design.layout,
      font: design.font,
      element_fonts: design.elementFonts ?? {},
      element_sizes: design.elementSizes ?? {},
      element_widths: design.elementWidths ?? {},
      element_heights: design.elementHeights ?? {},
      element_aligns: design.elementAligns ?? {},
      headline: design.headline,
      body: design.body,
      show_seal: design.showSeal,
      seal_label: design.sealLabel,
      seal_style: design.sealStyle,
      seal_accent: design.sealAccent,
      seal_svg_url: design.sealSvgUrl,
      seal_svg_name: design.sealSvgName,
      images: design.images,
    },
    signatories: design.signatories.map((signatory) => ({
      coordinator_id: signatory.coordinatorId,
    })),
  }
}

export async function listCertificateTemplates(): Promise<CertificateTemplate[]> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: CertificateTemplateApi[]
    }>(TEMPLATES_URL)

    return Promise.all(body.data.map(mapTemplate))
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

export async function saveCertificateTemplate(
  id: string,
  input: CertificateTemplateInput,
): Promise<CertificateTemplate> {
  try {
    const { data: body } = await apiClient.put<{
      ok: true
      data: CertificateTemplateApi
    }>(`${TEMPLATES_URL}/${id}`, toSavePayload(input))

    return mapTemplate(body.data)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

export async function createCertificateTemplate(
  input: NewCertificateTemplateInput,
): Promise<CertificateTemplate> {
  try {
    const { data: body } = await apiClient.post<{
      ok: true
      data: CertificateTemplateApi
    }>(TEMPLATES_URL, {
      name: input.name,
      description: input.description,
      category: input.category,
      orientation: input.orientation,
    })

    return mapTemplate(body.data)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

export async function deleteCertificateTemplate(id: string): Promise<void> {
  try {
    await apiClient.delete(`${TEMPLATES_URL}/${id}`)
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

export function countCertificateTemplates(
  templates: CertificateTemplate[],
): CertificateTemplateCounts {
  return {
    total: templates.length,
    published: templates.filter((one) => one.status === 'published').length,
    draft: templates.filter((one) => one.status === 'draft').length,
    archived: templates.filter((one) => one.status === 'archived').length,
    issued: templates.reduce((sum, one) => sum + one.issued, 0),
  }
}

/** The accounts offered in the signatory picker. */
export async function listSignatoryCoordinators(): Promise<SignatoryCoordinator[]> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: SignatoryCoordinatorApi[]
    }>(`${TEMPLATES_URL}/signatories`)

    return body.data.map((coordinator) => ({
      id: coordinator.id,
      name: coordinator.name,
      title: coordinator.title,
      department: coordinator.department,
      email: coordinator.email,
      hasSignature: coordinator.has_signature,
    }))
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}
