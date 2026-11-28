export type LegalListItem = string | { term: string; text: string }

export type LegalBlock = string | { items: readonly LegalListItem[] }

export interface LegalSection {
  id: string
  title: string
  blocks: readonly LegalBlock[]
}

export interface LegalDocument {
  title: string
  summary: string
  /** e.g. "24 November 2026". */
  effectiveDate: string
  sections: readonly LegalSection[]
}
