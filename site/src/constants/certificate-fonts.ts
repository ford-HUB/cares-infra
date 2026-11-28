import type {
  CertificateDesign,
  CertificateElementId,
  CertificateFontId,
} from '../types/certificate-template'

/** Google Fonts faces (`@import` in index.css); `default` defers to the frame preset. */
export const CERTIFICATE_FONT_ORDER: CertificateFontId[] = [
  'default',
  'old_english',
  'pirata',
  'cinzel',
  'playfair',
  'cormorant',
  'garamond',
  'baskerville',
  'lora',
  'merriweather',
  'great_vibes',
  'pinyon',
  'dancing_script',
  'montserrat',
  'lato',
  'inter',
]

export interface CertificateFontPreset {
  label: string
  group: 'Default' | 'Blackletter' | 'Serif' | 'Script' | 'Sans'
  note: string
  /** `null` for `default`: keep the frame's classes. */
  stack: string | null
}

export const CERTIFICATE_FONT_PRESETS: Record<CertificateFontId, CertificateFontPreset> =
  {
    default: {
      label: 'Frame default',
      group: 'Default',
      note: "Keeps the frame's own typography.",
      stack: null,
    },
    old_english: {
      label: 'Old English',
      group: 'Blackletter',
      note: 'The DepEd-style blackletter heading.',
      stack: "'UnifrakturMaguntia', 'Old English Text MT', 'Blackadder ITC', serif",
    },
    pirata: {
      label: 'Pirata One',
      group: 'Blackletter',
      note: 'Lighter blackletter — legible at body size.',
      stack: "'Pirata One', 'Old English Text MT', serif",
    },
    cinzel: {
      label: 'Cinzel',
      group: 'Serif',
      note: 'Roman capitals — formal headings.',
      stack: "'Cinzel', 'Trajan Pro', Georgia, serif",
    },
    playfair: {
      label: 'Playfair Display',
      group: 'Serif',
      note: 'High-contrast display serif.',
      stack: "'Playfair Display', Georgia, serif",
    },
    cormorant: {
      label: 'Cormorant Garamond',
      group: 'Serif',
      note: 'Fine old-style serif for award names.',
      stack: "'Cormorant Garamond', Garamond, Georgia, serif",
    },
    garamond: {
      label: 'EB Garamond',
      group: 'Serif',
      note: 'Classic book serif — reads well as body text.',
      stack: "'EB Garamond', Garamond, Georgia, serif",
    },
    baskerville: {
      label: 'Libre Baskerville',
      group: 'Serif',
      note: 'Sturdy serif built for screens and print alike.',
      stack: "'Libre Baskerville', Baskerville, Georgia, serif",
    },
    lora: {
      label: 'Lora',
      group: 'Serif',
      note: 'Contemporary serif with a calligraphic edge.',
      stack: "'Lora', Georgia, serif",
    },
    merriweather: {
      label: 'Merriweather',
      group: 'Serif',
      note: 'Heavier serif — holds up in small print.',
      stack: "'Merriweather', Georgia, serif",
    },
    great_vibes: {
      label: 'Great Vibes',
      group: 'Script',
      note: 'Flowing script for recipient names.',
      stack: "'Great Vibes', 'Segoe Script', cursive",
    },
    pinyon: {
      label: 'Pinyon Script',
      group: 'Script',
      note: 'Formal copperplate script.',
      stack: "'Pinyon Script', 'Edwardian Script ITC', cursive",
    },
    dancing_script: {
      label: 'Dancing Script',
      group: 'Script',
      note: 'Relaxed handwriting — good for signatures.',
      stack: "'Dancing Script', 'Segoe Script', cursive",
    },
    montserrat: {
      label: 'Montserrat',
      group: 'Sans',
      note: 'Geometric sans for a modern sheet.',
      stack: "'Montserrat', 'Segoe UI', sans-serif",
    },
    lato: {
      label: 'Lato',
      group: 'Sans',
      note: 'Neutral humanist sans.',
      stack: "'Lato', 'Segoe UI', sans-serif",
    },
    inter: {
      label: 'Inter',
      group: 'Sans',
      note: 'The portal’s own face.',
      stack: "'Inter', ui-sans-serif, system-ui, sans-serif",
    },
  }

export const CERTIFICATE_FONT_GROUP_ORDER: CertificateFontPreset['group'][] = [
  'Default',
  'Blackletter',
  'Serif',
  'Script',
  'Sans',
]

export const DEFAULT_CERTIFICATE_FONT: CertificateFontId = 'default'

/** Element override, then sheet font; `default` falls through to the frame preset. */
export function resolveElementFont(
  design: CertificateDesign,
  id: CertificateElementId,
): CertificateFontId {
  const override = design.elementFonts?.[id]
  if (override && override !== 'default') return override
  return design.font ?? DEFAULT_CERTIFICATE_FONT
}

export function elementFontStyle(
  design: CertificateDesign,
  id: CertificateElementId,
): { fontFamily: string } | undefined {
  const stack = CERTIFICATE_FONT_PRESETS[resolveElementFont(design, id)].stack
  return stack ? { fontFamily: stack } : undefined
}
