/** A bullet in a legal section: plain text, or a bold lead term followed by its text. */
export type LegalListItem = string | { term: string; text: string }

/** One block inside a section: a paragraph, or a bulleted list. */
export type LegalBlock = string | { items: readonly LegalListItem[] }

export interface LegalSection {
  /** Anchor id — the table of contents and deep links point at it. */
  id: string
  title: string
  blocks: readonly LegalBlock[]
}

export interface LegalDocument {
  title: string
  /** One-line plain-language summary shown under the title. */
  summary: string
  /** Human-readable effective date, e.g. "24 November 2026". */
  effectiveDate: string
  sections: readonly LegalSection[]
}
