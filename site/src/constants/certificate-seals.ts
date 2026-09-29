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
  /** One line on when this seal suits a certificate. */
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

/** What a certificate seals with until the director picks another. */
export const DEFAULT_CERTIFICATE_SEAL: CertificateSealStyle = 'stamp'

export function sealStyleOf(design: CertificateDesign): CertificateSealStyle {
  return design.sealStyle ?? DEFAULT_CERTIFICATE_SEAL
}

/**
 * A seal is often the one part of a certificate in its own colour — a gold seal on a
 * blue sheet — so it may carry an accent of its own, falling back to the sheet's.
 */
export function sealAccentOf(design: CertificateDesign): CertificateAccent {
  return design.sealAccent ?? design.accent
}

/** Imported seals are inlined as data URLs in the mock, so keep them small. */
export const SEAL_SVG_MAX_BYTES = 512 * 1024
export const SEAL_SVG_ACCEPTED_TYPES = 'image/svg+xml'
