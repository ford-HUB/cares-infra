import type {
  CertificateDesign,
  CertificateElementId,
  CertificateLayout,
} from '../types/certificate-template'

export const CERTIFICATE_ELEMENT_ORDER: CertificateElementId[] = [
  'headline',
  'title',
  'body',
  'seal',
  'signatures',
]

export const CERTIFICATE_ELEMENT_LABELS: Record<CertificateElementId, string> = {
  headline: 'Headline',
  title: 'Award name',
  body: 'Award text',
  seal: 'Seal',
  signatures: 'Signatures',
}

export const DEFAULT_CERTIFICATE_LAYOUT: CertificateLayout = {
  headline: { x: 50, y: 25 },
  title: { x: 50, y: 43 },
  body: { x: 50, y: 58 },
  seal: { x: 50, y: 73 },
  signatures: { x: 50, y: 88 },
}

export const LAYOUT_MIN = 4
export const LAYOUT_MAX = 96

export const SNAP_THRESHOLD = 1.2

export const DISTRIBUTE_TOP = 12
export const DISTRIBUTE_BOTTOM = 88

export const NUDGE_STEP = 0.5
export const NUDGE_STEP_LARGE = 2.5

export const RULER_TICK_STEP = 5
export const RULER_LABEL_STEP = 25

export function isElementVisible(
  id: CertificateElementId,
  design: CertificateDesign,
): boolean {
  if (id === 'seal') return design.showSeal
  if (id === 'signatures') return design.signatories.length > 0
  return true
}

export function clampPosition(value: number): number {
  return Math.min(LAYOUT_MAX, Math.max(LAYOUT_MIN, value))
}

export function snapToGuides(value: number, guides: number[]): number {
  const hit = guides.find((guide) => Math.abs(guide - value) <= SNAP_THRESHOLD)
  return hit ?? value
}

export function centerHorizontally(
  layout: CertificateLayout,
  ids: CertificateElementId[],
): CertificateLayout {
  const next = { ...layout }
  ids.forEach((id) => {
    next[id] = { ...next[id], x: 50 }
  })
  return next
}

export function distributeVertically(
  layout: CertificateLayout,
  ids: CertificateElementId[],
): CertificateLayout {
  if (ids.length === 0) return layout

  const ordered = [...ids].sort((a, b) => layout[a].y - layout[b].y)
  const span = DISTRIBUTE_BOTTOM - DISTRIBUTE_TOP
  const step = ordered.length > 1 ? span / (ordered.length - 1) : 0

  const next = { ...layout }
  ordered.forEach((id, index) => {
    next[id] = {
      ...next[id],
      y: ordered.length > 1 ? DISTRIBUTE_TOP + step * index : 50,
    }
  })
  return next
}

/** Inlined as data URLs in the mock. */
export const FRAME_SVG_MAX_BYTES = 1024 * 1024
export const FRAME_SVG_ACCEPTED_TYPES = 'image/svg+xml'
