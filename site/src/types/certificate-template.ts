export type CertificateTemplateStatus = 'published' | 'draft' | 'archived'

export type CertificateTemplateCategory =
  | 'participation'
  | 'appreciation'
  | 'volunteer_hours'
  | 'completion'
  | 'sponsorship'

export type CertificateOrientation = 'landscape' | 'portrait'

/** Chosen by the director, not the category. */
export type CertificateAccent = 'emerald' | 'sky' | 'violet' | 'rose' | 'amber' | 'slate'

export type CertificateFrame =
  | 'plain'
  | 'classic'
  | 'modern'
  | 'minimal'
  | 'royal'
  | 'diagonal'
  | 'corners'

/** `default` leaves the typography to the frame preset. */
export type CertificateFontId =
  | 'default'
  | 'old_english'
  | 'pirata'
  | 'cinzel'
  | 'playfair'
  | 'cormorant'
  | 'garamond'
  | 'baskerville'
  | 'lora'
  | 'merriweather'
  | 'great_vibes'
  | 'pinyon'
  | 'dancing_script'
  | 'montserrat'
  | 'lato'
  | 'inter'

/** An uploaded SVG replaces the picked one. */
export type CertificateSealStyle =
  | 'stamp'
  | 'starburst'
  | 'rosette'
  | 'laurel'
  | 'ribbon'
  | 'monogram'

export type CertificateTextAlign = 'left' | 'center' | 'right'

/** Absent keeps the frame's weight. */
export type CertificateFontWeight = 'regular' | 'semibold' | 'bold' | 'extrabold'

export interface SignatoryCoordinator {
  id: string
  name: string
  /** Derived from the account's role. */
  title: string
  department: string
  email: string
  /** False until the account uploads a signature image. */
  hasSignature: boolean
  /** Not served to other accounts; `SignatoryAvatar` uses initials. */
  avatarUrl?: string
}

export interface CertificateSignatory {
  id: string
  coordinatorId: string
  name: string
  title: string
  department: string
  /** Always `{{signature-image}}`; see `SIGNATURE_IMAGE_TOKEN`. */
  signatureToken: string
  /** False until the coordinator uploads a signature image. */
  hasSignature: boolean
  avatarUrl?: string
}

/** Movable text pieces; images are their own layer. */
export type CertificateElementId =
  | 'headline'
  | 'title'
  | 'body'
  | 'seal'
  | 'signatures'

/** Percentage of the sheet, anchored on the element's centre. */
export interface CertificateElementPosition {
  x: number
  y: number
}

export type CertificateLayout = Record<CertificateElementId, CertificateElementPosition>

export type CertificateImageShape = 'square' | 'rounded' | 'circle' | 'triangle'

export interface CertificateImage {
  id: string
  /** Data URL while importing, object URL once stored (see `certificate-asset-cache`). */
  url: string
  name: string
  /** Centre, as a percentage of the sheet. */
  x: number
  y: number
  /** Percentage of the sheet's width and height. */
  width: number
  height: number
  shape: CertificateImageShape
  /** Negative sits behind the text, positive in front. */
  z: number
}

export interface CertificateDesign {
  accent: CertificateAccent
  /** Ignored while an uploaded SVG is in use. */
  frame: CertificateFrame
  frameSvgUrl?: string
  frameSvgName?: string
  layout: CertificateLayout
  /** Absent or `default` keeps the frame's faces. */
  font?: CertificateFontId
  elementFonts?: Partial<Record<CertificateElementId, CertificateFontId>>
  /** Points; absent means the block's default. */
  elementSizes?: Partial<Record<CertificateElementId, number>>
  /** Percentage of the sheet. */
  elementWidths?: Partial<Record<CertificateElementId, number>>
  /** Percentage of the sheet; absent means it fits its text. */
  elementHeights?: Partial<Record<CertificateElementId, number>>
  /** Absent means centred. */
  elementAligns?: Partial<Record<CertificateElementId, CertificateTextAlign>>
  /** Absent means the frame's weight. */
  elementWeights?: Partial<Record<CertificateElementId, CertificateFontWeight>>
  elementUnderlines?: Partial<Record<CertificateElementId, boolean>>
  /** e.g. `Certificate of Appreciation`. */
  headline: string
  /** May carry `{{token}}`s; absent on older templates, which print the template name. */
  title?: string
  /** May carry `{{token}}` placeholders. */
  body: string
  showSeal: boolean
  sealLabel: string
  /** Absent means the plain stamp. */
  sealStyle?: CertificateSealStyle
  /** Absent follows the sheet's accent. */
  sealAccent?: CertificateAccent
  sealSvgUrl?: string
  sealSvgName?: string
  images: CertificateImage[]
  signatories: CertificateSignatory[]
}

export interface CertificateTemplate {
  id: string
  /** e.g. `CT-2026-014`. */
  reference: string
  name: string
  description: string
  category: CertificateTemplateCategory
  status: CertificateTemplateStatus
  orientation: CertificateOrientation
  issued: number
  deployedEvents: number
  design: CertificateDesign
  updatedAt: string
  updatedBy: string
}

/** Parts of `total`, plus the independent issued tally. */
export interface CertificateTemplateCounts {
  total: number
  published: number
  draft: number
  archived: number
  issued: number
}

export interface CertificateTemplateInput {
  name: string
  description: string
  category: CertificateTemplateCategory
  status: CertificateTemplateStatus
  orientation: CertificateOrientation
  design: CertificateDesign
}

export interface NewCertificateTemplateInput {
  name: string
  description: string
  category: CertificateTemplateCategory
  orientation: CertificateOrientation
}
