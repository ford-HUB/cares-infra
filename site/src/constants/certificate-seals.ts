import type {
  CertificateAccent,
  CertificateDesign,
  CertificateSealStyle,
} from '../types/certificate-template'

export const CERTIFICATE_SEAL_ORDER: CertificateSealStyle[] = [
  'stamp',
  'starburst',
  'rosette',
  'laurel',
  'ribbon',
  'monogram',
]

export interface CertificateSealPreset {
  label: string
  description: string
}

export const CERTIFICATE_SEAL_PRESETS: Record<
  CertificateSealStyle,
  CertificateSealPreset
> = {
  stamp: {
    label: 'Stamp',
    description: 'Plain disc with a stamp mark.',
  },
  starburst: {
    label: 'Starburst',
    description: 'Pointed medallion — the classic award seal.',
  },
  rosette: {
    label: 'Rosette',
    description: 'Scalloped badge with ribbon tails.',
  },
  laurel: {
    label: 'Laurel',
    description: 'Wreath around the label, for merit awards.',
  },
  ribbon: {
    label: 'Ribbon',
    description: 'Disc crossed by a banner.',
  },
  monogram: {
    label: 'Monogram',
    description: 'Two thin rings — quiet and formal.',
  },
}

export const DEFAULT_CERTIFICATE_SEAL: CertificateSealStyle = 'stamp'

export function sealStyleOf(design: CertificateDesign): CertificateSealStyle {
  return design.sealStyle ?? DEFAULT_CERTIFICATE_SEAL
}

/** Seal may carry its own accent, falling back to the sheet's. */
export function sealAccentOf(design: CertificateDesign): CertificateAccent {
  return design.sealAccent ?? design.accent
}

/** Inlined as data URLs in the mock. */
export const SEAL_SVG_MAX_BYTES = 512 * 1024
export const SEAL_SVG_ACCEPTED_TYPES = 'image/svg+xml'
