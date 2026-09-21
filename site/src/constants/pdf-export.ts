/** Shared look of every PDF the portal generates — one document system, not one per page. */

/** A4 portrait, millimetres — the unit every helper below measures in. */
export const PDF_PAGE_FORMAT = 'a4'
export const PDF_UNIT = 'mm'
export const PDF_MARGIN_MM = 14
/** Space kept clear at the bottom of every page for the footer line. */
export const PDF_FOOTER_HEIGHT_MM = 12

/** Brand green (`--cares-primary`) as RGB, for the title band and table heads. */
export const PDF_BRAND_RGB: [number, number, number] = [27, 67, 50]
export const PDF_TEXT_RGB: [number, number, number] = [17, 24, 39]
export const PDF_MUTED_RGB: [number, number, number] = [107, 114, 128]
export const PDF_RULE_RGB: [number, number, number] = [229, 231, 235]
export const PDF_STRIPE_RGB: [number, number, number] = [249, 250, 251]

export const PDF_FONT = 'helvetica'
export const PDF_TITLE_SIZE = 18
export const PDF_SUBTITLE_SIZE = 10.5
export const PDF_HEADING_SIZE = 12.5
export const PDF_BODY_SIZE = 9.5
export const PDF_TABLE_SIZE = 8.5
export const PDF_FOOTER_SIZE = 8

/** Name printed in the footer of every export. */
export const PDF_BRAND_NAME = 'CARES — Community Assistance & Response Engagement System'

export const PDF_GENERATED_AT_FORMAT = 'MMMM D, YYYY · h:mm A'
export const PDF_DATE_FORMAT = 'MMM D, YYYY'
export const PDF_FILENAME_DATE_FORMAT = 'YYYY-MM-DD'

/** Filename stems; the export appends its scope and the date. */
export const STATISTICS_PDF_FILENAME = 'statistics-report'
export const EVALUATION_ANSWERS_PDF_FILENAME = 'evaluation-answers'
export const EVENTS_PDF_FILENAME = 'events'
