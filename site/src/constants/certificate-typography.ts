import type {
  CertificateDesign,
  CertificateElementId,
  CertificateTextAlign,
} from '../types/certificate-template'

/**
 * Text is sized in points, the way a director already thinks about it, and drawn in
 * container units so the same certificate reads identically in the editor, the detail
 * preview and a full-page print. A landscape sheet is treated as 11in of paper, so a
 * point converts once, here, rather than per component.
 */
export const SHEET_WIDTH_PT = 792

export function ptToCqw(pt: number): number {
  return (pt * 100) / SHEET_WIDTH_PT
}

/** Google Docs' own ladder — the picker steps through these, 8pt at the bottom. */
export const FONT_SIZE_STEPS = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 60, 72, 96,
]

export const FONT_SIZE_MIN = 8
export const FONT_SIZE_MAX = 144

/** What each block prints at until the director changes it. */
export const DEFAULT_ELEMENT_SIZES_PT: Record<CertificateElementId, number> = {
  headline: 16,
  title: 40,
  body: 16,
  seal: 12,
  signatures: 14,
}

/** Width each block occupies, as a percentage of the sheet; the seal sizes itself. */
export const DEFAULT_ELEMENT_WIDTHS: Record<CertificateElementId, number> = {
  headline: 80,
  title: 80,
  body: 70,
  seal: 10,
  signatures: 80,
}

/** A block cannot be squeezed to nothing, nor run past the sheet. */
export const ELEMENT_WIDTH_MIN = 10
export const ELEMENT_WIDTH_MAX = 100

/** Height is a percentage of the sheet; unset means the block is as tall as its text. */
export const ELEMENT_HEIGHT_MIN = 4
export const ELEMENT_HEIGHT_MAX = 100

/** However tight the box gets, the text never shrinks past this share of its size. */
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

/** A fixed height, or `undefined` while the block still sizes itself to its text. */
export function elementHeight(
  design: CertificateDesign,
  id: CertificateElementId,
): number | undefined {
  return design.elementHeights?.[id]
}

/** Points the block is set in — its own size, else the block's default. */
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

/** The block's `font-size`, in sheet-relative units. */
export function elementSizeStyle(
  design: CertificateDesign,
  id: CertificateElementId,
  /** Share of the block's size, for the smaller lines under a signatory's name. */
  scale = 1,
): { fontSize: string } {
  // `--fit` is set by the block box when its text no longer fits the height it was
  // dragged to; it is 1 everywhere else, so a block left to size itself is unaffected.
  return {
    fontSize: `calc(${ptToCqw(elementFontSize(design, id) * scale)}cqw * var(--fit, 1))`,
  }
}

/** The lines under a signatory's name print a step down from it. */
export const SIGNATORY_TITLE_SCALE = 0.9
export const SIGNATORY_DEPARTMENT_SCALE = 0.8

/** Certificates are centred sheets, so every block starts centred. */
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

/** Where a block's own contents sit inside its box — the flex twin of `text-align`. */
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

/** A block that draws a single shape moves as a whole rather than aligning text. */
export const ALIGN_SELF_MARGIN: Record<CertificateTextAlign, string> = {
  left: 'mr-auto',
  center: 'mx-auto',
  right: 'ml-auto',
}
