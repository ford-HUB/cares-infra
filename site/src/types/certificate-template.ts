export type CertificateTemplateStatus = 'published' | 'draft' | 'archived'

export type CertificateTemplateCategory =
  | 'participation'
  | 'appreciation'
  | 'volunteer_hours'
  | 'completion'
  | 'sponsorship'

export type CertificateOrientation = 'landscape' | 'portrait'

/** Accent applied to the certificate itself — chosen by the director, not the category. */
export type CertificateAccent = 'emerald' | 'sky' | 'violet' | 'rose' | 'amber' | 'slate'

/** Pre-built frame designs; each carries its own ornament and text formatting. */
export type CertificateFrame =
  | 'plain'
  | 'classic'
  | 'modern'
  | 'minimal'
  | 'royal'
  | 'diagonal'
  | 'corners'

/**
 * Typeface a certificate is printed in — see `constants/certificate-fonts`.
 * `default` leaves the typography to the frame preset.
 */
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

/** Pre-built seal artwork; an uploaded SVG replaces whichever one is picked. */
export type CertificateSealStyle =
  | 'stamp'
  | 'starburst'
  | 'rosette'
  | 'laurel'
  | 'ribbon'
  | 'monogram'

/** Where a block's text sits inside its own box. */
export type CertificateTextAlign = 'left' | 'center' | 'right'

/** A staff account that can be printed as a signatory. */
export interface SignatoryCoordinator {
  id: string
  name: string
  /** Printed under the name; the portal derives it from the account's role. */
  title: string
  department: string
  email: string
  /** False until the account uploads a signature image on its profile. */
  hasSignature: boolean
  /** Staff photos are not served to other accounts — `SignatoryAvatar` uses initials. */
  avatarUrl?: string
}

export interface CertificateSignatory {
  id: string
  /** The coordinator account this line was picked from. */
  coordinatorId: string
  name: string
  title: string
  department: string
  /**
   * Always `{{signature-image}}`. The printed certificate substitutes the coordinator's
   * own signature image for it; the customizer deliberately does not show it, because a
   * director picks an account, not a picture. See `SIGNATURE_IMAGE_TOKEN`.
   */
  signatureToken: string
  /** False when the coordinator has not uploaded a signature image yet. */
  hasSignature: boolean
  avatarUrl?: string
}

/** Everything the director can customise about how a certificate is drawn. */
/** The movable text pieces on the sheet; images are their own layer. */
export type CertificateElementId =
  | 'headline'
  | 'title'
  | 'body'
  | 'seal'
  | 'signatures'

/** Position as a percentage of the sheet, anchored on the element's centre. */
export interface CertificateElementPosition {
  x: number
  y: number
}

export type CertificateLayout = Record<CertificateElementId, CertificateElementPosition>

export type CertificateImageShape = 'square' | 'rounded' | 'circle' | 'triangle'

/** An imported image placed on the sheet — logo, badge, sponsor mark, signature scan. */
export interface CertificateImage {
  id: string
  /**
   * A data URL while the file is being imported, and an object URL for one already
   * stored — the bytes live in a private bucket, so `certificate-asset-cache` fetches
   * them behind the bearer token and hands back a URL the browser can paint.
   */
  url: string
  name: string
  /** Centre of the image, as a percentage of the sheet. */
  x: number
  y: number
  /** Size as a percentage of the sheet's width and height. */
  width: number
  height: number
  shape: CertificateImageShape
  /** Stacking order; negative sits behind the text, positive in front of it. */
  z: number
}

export interface CertificateDesign {
  accent: CertificateAccent
  /** Built-in frame, ignored while an uploaded SVG is in use. */
  frame: CertificateFrame
  /** Imported SVG used as the sheet artwork — see `CertificateImage.url` on the form. */
  frameSvgUrl?: string
  /** Name of the imported file, shown in the frame tile. */
  frameSvgName?: string
  /** Where each element sits on the sheet. */
  layout: CertificateLayout
  /** Typeface for the whole sheet; absent or `default` keeps the frame's own faces. */
  font?: CertificateFontId
  /** Per-block override of the sheet typeface, e.g. a blackletter award name. */
  elementFonts?: Partial<Record<CertificateElementId, CertificateFontId>>
  /** Per-block text size in points; absent means the block's default. */
  elementSizes?: Partial<Record<CertificateElementId, number>>
  /** Per-block width as a percentage of the sheet, set by dragging its side grips. */
  elementWidths?: Partial<Record<CertificateElementId, number>>
  /** Per-block height as a percentage of the sheet; absent means it fits its text. */
  elementHeights?: Partial<Record<CertificateElementId, number>>
  /** Per-block text alignment; absent means centred. */
  elementAligns?: Partial<Record<CertificateElementId, CertificateTextAlign>>
  /** Eyebrow above the award line, e.g. `Certificate of Appreciation`. */
  headline: string
  /** Body copy; may carry `{{token}}` placeholders — see `constants/certificate-design`. */
  body: string
  showSeal: boolean
  sealLabel: string
  /** Which pre-built seal is drawn; absent means the plain stamp. */
  sealStyle?: CertificateSealStyle
  /** Colour of the seal; absent means it follows the sheet's accent. */
  sealAccent?: CertificateAccent
  /** Imported SVG seal, drawn instead of the pre-built one. */
  sealSvgUrl?: string
  /** Name of the imported file, shown next to the remove button. */
  sealSvgName?: string
  /** Imported images, each placed, sized and shaped on its own. */
  images: CertificateImage[]
  signatories: CertificateSignatory[]
}

export interface CertificateTemplate {
  id: string
  /** Human reference shown on the card, e.g. `CT-2026-014`. */
  reference: string
  name: string
  description: string
  category: CertificateTemplateCategory
  status: CertificateTemplateStatus
  orientation: CertificateOrientation
  /** Certificates already issued from this template. */
  issued: number
  /** Events currently deploying this template. */
  deployedEvents: number
  design: CertificateDesign
  updatedAt: string
  updatedBy: string
}

/** Parts of one whole (`total`), plus the independent issued tally. */
export interface CertificateTemplateCounts {
  total: number
  published: number
  draft: number
  archived: number
  issued: number
}

/** Everything a save submits — the customizer edits the whole template at once. */
export interface CertificateTemplateInput {
  name: string
  description: string
  category: CertificateTemplateCategory
  status: CertificateTemplateStatus
  orientation: CertificateOrientation
  design: CertificateDesign
}

/** A brand-new template starts from the server's defaults and is customised after. */
export interface NewCertificateTemplateInput {
  name: string
  description: string
  category: CertificateTemplateCategory
  orientation: CertificateOrientation
}
