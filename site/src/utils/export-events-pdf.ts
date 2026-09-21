import dayjs from 'dayjs'
import { formatNumber } from '../constants/formatting'
import {
  EVENTS_PDF_FILENAME,
  PDF_DATE_FORMAT,
  PDF_FILENAME_DATE_FORMAT,
} from '../constants/pdf-export'
import type { EventStatus, EventTableRow } from '../types/event'
import { PdfReport } from './pdf/pdf-report'

interface EventsPdfOptions {
  /** The college a coordinator is scoped to; absent for admins and directors. */
  scopeLabel?: string
  /** The filters in force, in words, so the reader knows what subset they hold. */
  filters: { label: string; value: string }[]
  /** Every event in scope before filtering — for the "N of M" line. */
  total: number
}

const STATUS_ORDER: EventStatus[] = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled']

function fillRate(current: number, max: number) {
  return max > 0 ? `${((current / max) * 100).toFixed(0)}%` : '—'
}

function donationSummary(row: EventTableRow) {
  const kinds = [row.funds && 'Funds', row.goods && 'Goods'].filter(Boolean)
  return kinds.length ? kinds.join(', ') : '—'
}

/**
 * The Manage Events grid as a report: the filters that produced it, a count per
 * status, then one row per event in the order the table shows them. Landscape,
 * because ten columns of event detail don't fit a portrait page.
 */
export function exportEventsPdf(
  rows: EventTableRow[],
  { scopeLabel, filters, total }: EventsPdfOptions,
) {
  const report = new PdfReport({ landscape: true })
  const activeFilters = filters.filter((f) => f.value)
  const byStatus = Object.fromEntries(
    STATUS_ORDER.map((status) => [status, rows.filter((r) => r.status === status).length]),
  ) as Record<EventStatus, number>
  const participants = rows.reduce((sum, r) => sum + r.currentParticipants, 0)
  const capacity = rows.reduce((sum, r) => sum + r.maxParticipants, 0)

  report.title(
    scopeLabel ? 'Department Events Report' : 'All Events Report',
    'Events list from the Manage Events screen',
    [
      { label: 'Scope', value: scopeLabel ?? 'All departments' },
      {
        label: 'Events',
        value:
          rows.length === total
            ? `${formatNumber(total)} (all events)`
            : `${formatNumber(rows.length)} of ${formatNumber(total)} after filters`,
      },
      {
        label: 'Filters',
        value: activeFilters.length
          ? activeFilters.map((f) => `${f.label}: ${f.value}`).join(' · ')
          : 'None',
      },
    ],
  )

  // ── Headline figures ────────────────────────────────────────────────────────
  report.heading('Summary')
  report.facts(
    [
      { label: 'Events', value: formatNumber(rows.length) },
      ...STATUS_ORDER.map((status) => ({
        label: status,
        value: formatNumber(byStatus[status]),
      })),
      {
        label: 'Registered participants',
        value: formatNumber(participants),
        note: `${fillRate(participants, capacity)} of ${formatNumber(capacity)} capacity`,
      },
    ],
    6,
  )

  // ── Every event ────────────────────────────────────────────────────────────
  report.heading('Events', `${rows.length} listed`)
  report.table(
    [
      '#',
      'Event',
      'Category',
      'Department',
      'When',
      'Location',
      'Organizer',
      'Participants',
      'Donations',
      'Status',
    ],
    rows.map((row, index) => [
      String(index + 1),
      row.title,
      row.type,
      row.department || '—',
      `${dayjs(row.rawEvent.event_started).format(PDF_DATE_FORMAT)}\n${row.timeRange}`,
      row.location,
      row.organizer,
      `${formatNumber(row.currentParticipants)} / ${formatNumber(row.maxParticipants)}`,
      donationSummary(row),
      row.status,
    ]),
    {
      numericColumns: [0, 7],
      columnWidths: { 0: 8, 1: 58, 2: 26, 3: 36, 4: 32, 7: 22, 8: 20, 9: 20 },
      emptyMessage: 'No events match the current filters.',
    },
  )

  const scopeSlug = (scopeLabel ?? 'all-events')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  report.save(
    `${EVENTS_PDF_FILENAME}-${scopeSlug}-${dayjs().format(PDF_FILENAME_DATE_FORMAT)}.pdf`,
  )
}
