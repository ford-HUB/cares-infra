import dayjs from 'dayjs'
import { jsPDF } from 'jspdf'
import autoTable, { type CellDef, type RowInput, type UserOptions } from 'jspdf-autotable'
import {
  PDF_BODY_SIZE,
  PDF_BRAND_NAME,
  PDF_BRAND_RGB,
  PDF_FONT,
  PDF_FOOTER_HEIGHT_MM,
  PDF_FOOTER_SIZE,
  PDF_GENERATED_AT_FORMAT,
  PDF_HEADING_SIZE,
  PDF_MARGIN_MM,
  PDF_MUTED_RGB,
  PDF_PAGE_FORMAT,
  PDF_RULE_RGB,
  PDF_STRIPE_RGB,
  PDF_SUBTITLE_SIZE,
  PDF_TABLE_SIZE,
  PDF_TEXT_RGB,
  PDF_TITLE_SIZE,
  PDF_UNIT,
} from '../../constants/pdf-export'

/** The plugin records where the last table ended on the document itself. */
type AutoTableDoc = jsPDF & { lastAutoTable?: { finalY: number } }

export type PdfCell = string | number | CellDef
export type PdfRow = PdfCell[]

export interface PdfTableOptions {
  /** Column indexes rendered right-aligned — numbers, rates. */
  numericColumns?: number[]
  /** Explicit widths in mm by column index; the rest share what is left. */
  columnWidths?: Record<number, number>
  /** A closing row (totals, averages) drawn bold above a rule. */
  foot?: PdfRow
  /** Shown in place of the table when `body` is empty. */
  emptyMessage?: string
}

/**
 * One portal report, page by page. Owns the cursor so callers stack headings,
 * paragraphs and tables without measuring anything; the first page gets the title
 * band and every page the same footer (brand, generated at, page N of M).
 */
export class PdfReport {
  private readonly doc: AutoTableDoc
  private y: number
  private readonly pageWidth: number
  private readonly pageHeight: number
  private readonly generatedAt: string

  /** Landscape suits wide tables — many columns, long titles. */
  constructor(options: { landscape?: boolean } = {}) {
    this.doc = new jsPDF({
      unit: PDF_UNIT,
      format: PDF_PAGE_FORMAT,
      orientation: options.landscape ? 'landscape' : 'portrait',
    })
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
    this.generatedAt = dayjs().format(PDF_GENERATED_AT_FORMAT)
    this.y = PDF_MARGIN_MM
  }

  /** Width of the printable area between the margins. */
  get contentWidth() {
    return this.pageWidth - PDF_MARGIN_MM * 2
  }

  private get bottomLimit() {
    return this.pageHeight - PDF_MARGIN_MM - PDF_FOOTER_HEIGHT_MM
  }

  /** Starts a new page when `height` mm would not fit above the footer. */
  ensureSpace(height: number) {
    if (this.y + height > this.bottomLimit) {
      this.doc.addPage()
      this.y = PDF_MARGIN_MM
    }
  }

  /** Title band: report name, one-line subtitle, then the scope lines as "Label: value". */
  title(title: string, subtitle: string, meta: { label: string; value: string }[]) {
    const { doc } = this
    const bandHeight = 22
    doc.setFillColor(...PDF_BRAND_RGB)
    doc.rect(0, 0, this.pageWidth, bandHeight, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont(PDF_FONT, 'bold')
    doc.setFontSize(PDF_TITLE_SIZE)
    doc.text(title, PDF_MARGIN_MM, 11)
    doc.setFont(PDF_FONT, 'normal')
    doc.setFontSize(PDF_SUBTITLE_SIZE)
    doc.text(subtitle, PDF_MARGIN_MM, 17.5)

    this.y = bandHeight + 8
    doc.setFontSize(PDF_BODY_SIZE)
    for (const item of meta) {
      doc.setTextColor(...PDF_MUTED_RGB)
      doc.setFont(PDF_FONT, 'bold')
      doc.text(`${item.label}:`, PDF_MARGIN_MM, this.y)
      const labelWidth = doc.getTextWidth(`${item.label}: `)
      doc.setTextColor(...PDF_TEXT_RGB)
      doc.setFont(PDF_FONT, 'normal')
      const lines = doc.splitTextToSize(item.value, this.contentWidth - labelWidth) as string[]
      doc.text(lines, PDF_MARGIN_MM + labelWidth, this.y)
      this.y += lines.length * 4.6
    }
    this.y += 2
    this.rule()
  }

  /** A section heading with a little air above it, kept with the block that follows. */
  heading(text: string, note?: string) {
    this.ensureSpace(22)
    this.y += 4
    const { doc } = this
    doc.setTextColor(...PDF_BRAND_RGB)
    doc.setFont(PDF_FONT, 'bold')
    doc.setFontSize(PDF_HEADING_SIZE)
    doc.text(text, PDF_MARGIN_MM, this.y)
    if (note) {
      doc.setTextColor(...PDF_MUTED_RGB)
      doc.setFont(PDF_FONT, 'normal')
      doc.setFontSize(PDF_BODY_SIZE)
      doc.text(note, this.pageWidth - PDF_MARGIN_MM, this.y, { align: 'right' })
    }
    this.y += 5
  }

  /** A smaller run-in heading for a sub-block — one question, one respondent. */
  subheading(text: string, note?: string) {
    this.ensureSpace(16)
    this.y += 2
    const { doc } = this
    doc.setTextColor(...PDF_TEXT_RGB)
    doc.setFont(PDF_FONT, 'bold')
    doc.setFontSize(PDF_BODY_SIZE + 0.5)
    const lines = doc.splitTextToSize(text, this.contentWidth - (note ? 40 : 0)) as string[]
    doc.text(lines, PDF_MARGIN_MM, this.y)
    if (note) {
      doc.setTextColor(...PDF_MUTED_RGB)
      doc.setFont(PDF_FONT, 'normal')
      doc.setFontSize(PDF_FOOTER_SIZE)
      doc.text(note, this.pageWidth - PDF_MARGIN_MM, this.y, { align: 'right' })
    }
    this.y += lines.length * 4.6 + 1
  }

  /** Body copy, wrapped to the content width. */
  paragraph(text: string, options: { muted?: boolean; italic?: boolean } = {}) {
    const { doc } = this
    doc.setFont(PDF_FONT, options.italic ? 'italic' : 'normal')
    doc.setFontSize(PDF_BODY_SIZE)
    doc.setTextColor(...(options.muted ? PDF_MUTED_RGB : PDF_TEXT_RGB))
    const lines = doc.splitTextToSize(text, this.contentWidth) as string[]
    for (const line of lines) {
      this.ensureSpace(5)
      doc.text(line, PDF_MARGIN_MM, this.y)
      this.y += 4.6
    }
    this.y += 1
  }

  /** Label-over-value tiles, `perRow` across — the stat row in print. */
  facts(items: { label: string; value: string; note?: string }[], perRow = 4) {
    const { doc } = this
    const cellWidth = this.contentWidth / perRow
    for (let start = 0; start < items.length; start += perRow) {
      const rowItems = items.slice(start, start + perRow)
      const rowHeight = rowItems.some((item) => item.note) ? 18 : 14
      this.ensureSpace(rowHeight + 2)
      rowItems.forEach((item, index) => {
        const x = PDF_MARGIN_MM + index * cellWidth
        doc.setFillColor(...PDF_STRIPE_RGB)
        doc.roundedRect(x + 0.5, this.y, cellWidth - 1.5, rowHeight, 1.5, 1.5, 'F')
        doc.setTextColor(...PDF_MUTED_RGB)
        doc.setFont(PDF_FONT, 'normal')
        doc.setFontSize(PDF_FOOTER_SIZE)
        doc.text(item.label.toUpperCase(), x + 3, this.y + 4.5)
        doc.setTextColor(...PDF_TEXT_RGB)
        doc.setFont(PDF_FONT, 'bold')
        doc.setFontSize(13)
        doc.text(item.value, x + 3, this.y + 10.5)
        if (item.note) {
          doc.setTextColor(...PDF_MUTED_RGB)
          doc.setFont(PDF_FONT, 'normal')
          doc.setFontSize(PDF_FOOTER_SIZE)
          doc.text(item.note, x + 3, this.y + 15)
        }
      })
      this.y += rowHeight + 2
    }
    this.y += 1
  }

  /** A striped table with a brand-coloured head; page breaks are handled for us. */
  table(head: string[], body: PdfRow[], options: PdfTableOptions = {}) {
    if (!body.length) {
      this.paragraph(options.emptyMessage ?? 'No records in this period.', {
        muted: true,
        italic: true,
      })
      return
    }

    const numeric = new Set(options.numericColumns ?? [])
    const columnStyles: UserOptions['columnStyles'] = {}
    head.forEach((_, index) => {
      const width = options.columnWidths?.[index]
      columnStyles[index] = {
        ...(numeric.has(index) ? { halign: 'right' } : {}),
        ...(width ? { cellWidth: width } : {}),
      }
    })

    this.ensureSpace(18)
    autoTable(this.doc, {
      startY: this.y,
      margin: {
        left: PDF_MARGIN_MM,
        right: PDF_MARGIN_MM,
        bottom: PDF_MARGIN_MM + PDF_FOOTER_HEIGHT_MM,
      },
      head: [head],
      body: body as RowInput[],
      foot: options.foot ? [options.foot as RowInput] : undefined,
      showFoot: 'lastPage',
      theme: 'plain',
      styles: {
        font: PDF_FONT,
        fontSize: PDF_TABLE_SIZE,
        cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 },
        textColor: PDF_TEXT_RGB,
        lineColor: PDF_RULE_RGB,
        lineWidth: { bottom: 0.15 },
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: PDF_BRAND_RGB,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        lineWidth: 0,
      },
      footStyles: {
        fillColor: PDF_STRIPE_RGB,
        textColor: PDF_TEXT_RGB,
        fontStyle: 'bold',
        lineWidth: { top: 0.3 },
        lineColor: PDF_BRAND_RGB,
      },
      alternateRowStyles: { fillColor: PDF_STRIPE_RGB },
      columnStyles,
      // Head and foot cells don't inherit column alignment, so numbers line up by hand.
      didParseCell: (data) => {
        if (numeric.has(data.column.index) && data.section !== 'body') {
          data.cell.styles.halign = 'right'
        }
      },
    })

    this.y = (this.doc.lastAutoTable?.finalY ?? this.y) + 4
  }

  private rule() {
    this.doc.setDrawColor(...PDF_RULE_RGB)
    this.doc.setLineWidth(0.2)
    this.doc.line(PDF_MARGIN_MM, this.y, this.pageWidth - PDF_MARGIN_MM, this.y)
    this.y += 4
  }

  /** Stamps every page's footer, then triggers the download. */
  save(filename: string) {
    const { doc } = this
    const pages = doc.getNumberOfPages()
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page)
      const y = this.pageHeight - PDF_MARGIN_MM + 2
      doc.setDrawColor(...PDF_RULE_RGB)
      doc.setLineWidth(0.2)
      doc.line(PDF_MARGIN_MM, y - 4, this.pageWidth - PDF_MARGIN_MM, y - 4)
      doc.setFont(PDF_FONT, 'normal')
      doc.setFontSize(PDF_FOOTER_SIZE)
      doc.setTextColor(...PDF_MUTED_RGB)
      doc.text(PDF_BRAND_NAME, PDF_MARGIN_MM, y)
      doc.text(
        `Generated ${this.generatedAt}  ·  Page ${page} of ${pages}`,
        this.pageWidth - PDF_MARGIN_MM,
        y,
        { align: 'right' },
      )
    }
    doc.save(filename)
  }
}
