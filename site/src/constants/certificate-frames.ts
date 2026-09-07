import type { CertificateFrame } from '../types/certificate-template'

export const CERTIFICATE_FRAME_ORDER: CertificateFrame[] = [
  'plain',
  'classic',
  'royal',
  'diagonal',
  'corners',
  'modern',
  'minimal',
]

/** Where the frame prints the seal. */
export type FrameSealPlacement = 'body' | 'signature-row' | 'body-right'

export interface CertificateFramePreset {
  label: string
  description: string
  /** Outer edge treatment of the sheet. */
  sheet: string
  /** Padding the ornament needs to clear. */
  padding: string
  headline: string
  /** The award line — a script-leaning face on the ornate frames. */
  title: string
  body: string
  signatureName: string
  sealPlacement: FrameSealPlacement
}

/**
 * One record per frame, holding both the ornament and the text formatting that goes
 * with it — a frame and its typography are one design decision, so they are picked
 * together rather than left to drift apart.
 */
export const CERTIFICATE_FRAME_PRESETS: Record<CertificateFrame, CertificateFramePreset> =
  {
    plain: {
      label: 'Plain',
      description: 'No frame or ornament — white sheet, text only.',
      sheet: 'border border-gray-200',
      padding: 'px-12 py-9',
      headline: 'font-sans tracking-[0.25em]',
      title: 'font-sans',
      body: 'font-sans',
      signatureName: 'font-sans',
      sealPlacement: 'body',
    },
    classic: {
      label: 'Classic',
      description: 'Double gold rule with an inner keyline. Formal serif wording.',
      sheet: 'border-4 border-double',
      padding: 'px-12 py-9',
      headline: 'font-serif tracking-[0.35em]',
      title: 'font-serif',
      body: 'font-serif',
      signatureName: 'font-serif',
      sealPlacement: 'body',
    },
    royal: {
      label: 'Royal',
      description: 'Curved side panel and gilt border. Script award name.',
      sheet: 'border-4 border-double',
      padding: 'pl-32 pr-12 py-9',
      headline: 'font-serif tracking-[0.3em]',
      title: 'font-serif italic',
      body: 'font-serif',
      signatureName: 'font-serif',
      sealPlacement: 'body-right',
    },
    diagonal: {
      label: 'Diagonal',
      description: 'Corner ribbons across two corners. Bold sans heading.',
      sheet: 'border-2',
      padding: 'px-14 py-10',
      headline: 'font-sans font-bold tracking-[0.25em]',
      title: 'font-serif italic',
      body: 'font-sans',
      signatureName: 'font-sans',
      sealPlacement: 'body',
    },
    corners: {
      label: 'Corner banner',
      description: 'Filled top corners and a base band. Heavy caps heading.',
      sheet: 'border border-transparent',
      padding: 'px-14 pt-12 pb-10',
      headline: 'font-sans font-extrabold tracking-[0.2em]',
      title: 'font-serif italic',
      body: 'font-sans',
      signatureName: 'font-serif italic',
      sealPlacement: 'signature-row',
    },
    modern: {
      label: 'Modern',
      description: 'Single rule under a solid header band. Clean sans wording.',
      sheet: 'border-2',
      padding: 'px-12 pt-12 pb-9',
      headline: 'font-sans font-semibold tracking-[0.28em]',
      title: 'font-sans',
      body: 'font-sans',
      signatureName: 'font-sans',
      sealPlacement: 'body',
    },
    minimal: {
      label: 'Minimal',
      description: 'Hairline dashed edge, no ornament. Quiet sans wording.',
      sheet: 'border border-dashed',
      padding: 'px-12 py-10',
      headline: 'font-sans tracking-[0.3em]',
      title: 'font-sans',
      body: 'font-sans',
      signatureName: 'font-sans',
      sealPlacement: 'body',
    },
  }

export const CERTIFICATE_FRAME_LABELS: Record<CertificateFrame, string> =
  Object.fromEntries(
    CERTIFICATE_FRAME_ORDER.map((frame) => [
      frame,
      CERTIFICATE_FRAME_PRESETS[frame].label,
    ]),
  ) as Record<CertificateFrame, string>

/** Imported logos are inlined as data URLs in the mock, so keep them small. */
export const LOGO_MAX_BYTES = 512 * 1024
export const LOGO_ACCEPTED_TYPES = 'image/png,image/jpeg,image/svg+xml,image/webp'
