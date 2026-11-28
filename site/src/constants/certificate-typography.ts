import type {
  CertificateDesign,
  CertificateElementId,
  CertificateFontWeight,
  CertificateTextAlign,
} from '../types/certificate-template'

/** Sizes in points, drawn in container units; landscape sheet treated as 11in. */
export const SHEET_WIDTH_PT = 792

export function ptToCqw(pt: number): number {
  return (pt * 100) / SHEET_WIDTH_PT
}

export const FONT_SIZE_STEPS = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 60, 72, 96,
]

export const FONT_SIZE_MIN = 8
export const FONT_SIZE_MAX = 144

export const DEFAULT_ELEMENT_SIZES_PT: Record<CertificateElementId, number> = {
  headline: 16,
  title: 40,
  body: 16,
  seal: 12,
  signatures: 14,
}

export const DEFAULT_ELEMENT_WIDTHS: Record<CertificateElementId, number> = {
  headline: 80,
  title: 80,
  body: 70,
  seal: 10,
  signatures: 80,
}

export const ELEMENT_WIDTH_MIN = 10
export const ELEMENT_WIDTH_MAX = 100

/** Percentage of the sheet; unset means sized to its text. */
export const ELEMENT_HEIGHT_MIN = 4
export const ELEMENT_HEIGHT_MAX = 100

export const MIN_FIT_SCALE = 0.4

export function clampFontSize(pt: number): number {
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(pt)))
}

export function clampElementWidth(width: number): number {
  return Math.min(ELEMENT_WIDTH_MAX, Math.max(ELEMENT_WIDTH_MIN, width))
}

export function clampElementHeight(height: number): number {
  return Math.min(ELEMENT_HEIGHT_MAX, Math.max(ELEMENT_HEIGHT_MIN, height))
}

export function elementHeight(
  design: CertificateDesign,
  id: CertificateElementId,
): number | undefined {
  return design.elementHeights?.[id]
}

export function elementFontSize(
  design: CertificateDesign,
  id: CertificateElementId,
): number {
  return design.elementSizes?.[id] ?? DEFAULT_ELEMENT_SIZES_PT[id]
}

export function elementWidth(
  design: CertificateDesign,
  id: CertificateElementId,
): number {
  return design.elementWidths?.[id] ?? DEFAULT_ELEMENT_WIDTHS[id]
}

export function elementSizeStyle(
  design: CertificateDesign,
  id: CertificateElementId,
  scale = 1,
): { fontSize: string } {
  // `--fit` is set by the block box when text overflows its dragged height; 1 otherwise.
  return {
    fontSize: `calc(${ptToCqw(elementFontSize(design, id) * scale)}cqw * var(--fit, 1))`,
  }
}

export const SIGNATORY_TITLE_SCALE = 0.9
export const SIGNATORY_DEPARTMENT_SCALE = 0.8

export const DEFAULT_TEXT_ALIGN: CertificateTextAlign = 'center'

export const TEXT_ALIGN_ORDER: CertificateTextAlign[] = ['left', 'center', 'right']

export const TEXT_ALIGN_LABELS: Record<CertificateTextAlign, string> = {
  left: 'Align left',
  center: 'Align centre',
  right: 'Align right',
}

export function elementAlign(
  design: CertificateDesign,
  id: CertificateElementId,
): CertificateTextAlign {
  return design.elementAligns?.[id] ?? DEFAULT_TEXT_ALIGN
}

export const FONT_WEIGHT_ORDER: CertificateFontWeight[] = [
  'regular',
  'semibold',
  'bold',
  'extrabold',
]

export const FONT_WEIGHT_LABELS: Record<CertificateFontWeight, string> = {
  regular: 'Regular',
  semibold: 'Semibold',
  bold: 'Bold',
  extrabold: 'Extra bold',
}

/** Mobile maps the same steps to `FontWeight.w*`. */
export const FONT_WEIGHT_VALUES: Record<CertificateFontWeight, number> = {
  regular: 400,
  semibold: 600,
  bold: 700,
  extrabold: 800,
}

export function elementWeight(
  design: CertificateDesign,
  id: CertificateElementId,
): CertificateFontWeight | undefined {
  return design.elementWeights?.[id]
}

export function elementUnderline(
  design: CertificateDesign,
  id: CertificateElementId,
): boolean {
  return design.elementUnderlines?.[id] ?? false
}

/** Inline style so a picked weight beats the frame's utility classes. */
export function elementEmphasisStyle(
  design: CertificateDesign,
  id: CertificateElementId,
): { fontWeight?: number; textDecoration?: string } {
  const weight = elementWeight(design, id)
  return {
    ...(weight ? { fontWeight: FONT_WEIGHT_VALUES[weight] } : {}),
    ...(elementUnderline(design, id) ? { textDecoration: 'underline' } : {}),
  }
}

export const ALIGN_ITEMS: Record<CertificateTextAlign, string> = {
  left: 'items-start',
  center: 'items-center',
  right: 'items-end',
}

export const ALIGN_JUSTIFY: Record<CertificateTextAlign, string> = {
  left: 'justify-start',
  center: 'justify-evenly',
  right: 'justify-end',
}

export const ALIGN_SELF_MARGIN: Record<CertificateTextAlign, string> = {
  left: 'mr-auto',
  center: 'mx-auto',
  right: 'ml-auto',
}
