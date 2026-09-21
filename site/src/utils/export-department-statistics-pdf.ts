import dayjs from 'dayjs'
import {
  ATTENDANCE_OUTCOME_ORDER,
  ATTENDANCE_OUTCOME_LABELS,
  REPORT_OUTCOME_LABELS,
  REPORT_OUTCOME_ORDER,
  STATISTICS_CATEGORY_ALL,
  STATISTICS_RANGE_OPTIONS,
} from '../constants/department-statistics'
import { formatNumber } from '../constants/formatting'
import {
  PDF_DATE_FORMAT,
  PDF_FILENAME_DATE_FORMAT,
  PDF_GENERATED_AT_FORMAT,
  STATISTICS_PDF_FILENAME,
} from '../constants/pdf-export'
import type {
  DepartmentStatistics,
  StatisticSummary,
} from '../types/department-statistics'
import { PdfReport } from './pdf/pdf-report'

interface StatisticsPdfOptions {
  /** The page's own heading — "Department Statistics" or "System Statistics". */
  title: string
  /** The category filter in force; `STATISTICS_CATEGORY_ALL` when unfiltered. */
  category: string
}

function rate(part: number, whole: number) {
  return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '—'
}

/** "+12.5% vs prior 6 mo", or "—" when the previous period is empty. */
function movement(summary: StatisticSummary, months: number) {
  if (summary.previous === null) return 'No prior period to compare'
  if (summary.previous === 0) {
    return summary.value === 0
      ? `Unchanged vs prior ${months} mo`
      : `New vs prior ${months} mo (was 0)`
  }
  const delta = ((summary.value - summary.previous) / summary.previous) * 100
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)}% vs prior ${months} mo`
}

function periodLabel(statistics: DepartmentStatistics) {
  const first = statistics.monthly[0]
  const last = statistics.monthly[statistics.monthly.length - 1]
  const range = STATISTICS_RANGE_OPTIONS.find((o) => o.value === statistics.range)
  const months = range?.label ?? statistics.range
  if (!first || !last) return `Last ${months}`
  return `Last ${months} (${first.label} – ${last.label})`
}

/**
 * The statistics screen as a printable report: the four headline numbers with their
 * movement, then every breakdown the charts draw from, as tables with totals — the
 * reader gets the figures, not pictures of them.
 */
export function exportDepartmentStatisticsPdf(
  statistics: DepartmentStatistics,
  { title, category }: StatisticsPdfOptions,
) {
  const report = new PdfReport()
  const scope = statistics.department ?? 'All departments'
  const months = STATISTICS_RANGE_OPTIONS.find((o) => o.value === statistics.range)
  const monthCount = months ? Number.parseInt(months.value, 10) : 0

  report.title(`${title} Report`, 'Activity, attendance and reporting over the selected period', [
    { label: 'Scope', value: scope },
    { label: 'Period', value: periodLabel(statistics) },
    {
      label: 'Event category',
      value: category === STATISTICS_CATEGORY_ALL ? 'All categories' : category,
    },
    {
      label: 'Data as of',
      value: dayjs(statistics.generatedAt).format(PDF_GENERATED_AT_FORMAT),
    },
  ])

  // ── Headline figures ────────────────────────────────────────────────────────
  report.heading('Summary')
  const { summary } = statistics
  report.facts([
    {
      label: 'Events held',
      value: formatNumber(summary.eventsHeld.value),
      note: movement(summary.eventsHeld, monthCount),
    },
    {
      label: 'Active volunteers',
      value: formatNumber(summary.activeVolunteers.value),
      note: movement(summary.activeVolunteers, monthCount),
    },
    {
      label: 'Attendance rate',
      value: `${summary.attendanceRate.value.toFixed(1)}%`,
      note: movement(summary.attendanceRate, monthCount),
    },
    {
      label: 'Service hours',
      value: formatNumber(summary.serviceHours.value),
      note: movement(summary.serviceHours, monthCount),
    },
  ])

  // ── Per-department share (system view only) ────────────────────────────────
  if (statistics.departments.length > 0) {
    const totals = statistics.departments.reduce(
      (acc, row) => ({
        events: acc.events + row.events,
        registrations: acc.registrations + row.registrations,
        attended: acc.attended + row.attended,
        serviceHours: acc.serviceHours + row.serviceHours,
      }),
      { events: 0, registrations: 0, attended: 0, serviceHours: 0 },
    )
    report.heading('Activity by department', `${statistics.departments.length} departments`)
    report.table(
      ['Department', 'Events', 'Registrations', 'Attended', 'Attendance rate', 'Service hours'],
      statistics.departments.map((row) => [
        row.department,
        formatNumber(row.events),
        formatNumber(row.registrations),
        formatNumber(row.attended),
        rate(row.attended, row.registrations),
        formatNumber(row.serviceHours),
      ]),
      {
        numericColumns: [1, 2, 3, 4, 5],
        foot: [
          'Total',
          formatNumber(totals.events),
          formatNumber(totals.registrations),
          formatNumber(totals.attended),
          rate(totals.attended, totals.registrations),
          formatNumber(totals.serviceHours),
        ],
      },
    )
  }

  // ── Month by month ─────────────────────────────────────────────────────────
  const monthlyTotals = statistics.monthly.reduce(
    (acc, row) => ({
      eventsHeld: acc.eventsHeld + row.eventsHeld,
      registrations: acc.registrations + row.registrations,
      attended: acc.attended + row.attended,
      serviceHours: acc.serviceHours + row.serviceHours,
    }),
    { eventsHeld: 0, registrations: 0, attended: 0, serviceHours: 0 },
  )
  report.heading('Monthly activity', `${statistics.monthly.length} months`)
  report.table(
    ['Month', 'Events held', 'Registrations', 'Attended', 'Attendance rate', 'Service hours'],
    statistics.monthly.map((row) => [
      row.label,
      formatNumber(row.eventsHeld),
      formatNumber(row.registrations),
      formatNumber(row.attended),
      rate(row.attended, row.registrations),
      formatNumber(row.serviceHours),
    ]),
    {
      numericColumns: [1, 2, 3, 4, 5],
      foot: [
        'Total',
        formatNumber(monthlyTotals.eventsHeld),
        formatNumber(monthlyTotals.registrations),
        formatNumber(monthlyTotals.attended),
        rate(monthlyTotals.attended, monthlyTotals.registrations),
        formatNumber(monthlyTotals.serviceHours),
      ],
    },
  )

  // ── Categories and attendance outcomes ─────────────────────────────────────
  const categoryTotals = statistics.categories.reduce(
    (acc, row) => {
      acc.events += row.events
      acc.registrations += row.registrations
      for (const outcome of ATTENDANCE_OUTCOME_ORDER) {
        acc.outcomes[outcome] += row.outcomes[outcome] ?? 0
      }
      return acc
    },
    {
      events: 0,
      registrations: 0,
      outcomes: { completed: 0, pending: 0, absent: 0 },
    },
  )
  report.heading('Events and attendance by category')
  report.table(
    [
      'Category',
      'Events',
      'Registrations',
      ...ATTENDANCE_OUTCOME_ORDER.map((o) => ATTENDANCE_OUTCOME_LABELS[o]),
      'Completion rate',
    ],
    statistics.categories.map((row) => [
      row.category,
      formatNumber(row.events),
      formatNumber(row.registrations),
      ...ATTENDANCE_OUTCOME_ORDER.map((o) => formatNumber(row.outcomes[o] ?? 0)),
      rate(row.outcomes.completed ?? 0, row.registrations),
    ]),
    {
      numericColumns: [1, 2, 3, 4, 5, 6],
      foot: [
        'Total',
        formatNumber(categoryTotals.events),
        formatNumber(categoryTotals.registrations),
        ...ATTENDANCE_OUTCOME_ORDER.map((o) => formatNumber(categoryTotals.outcomes[o])),
        rate(categoryTotals.outcomes.completed, categoryTotals.registrations),
      ],
    },
  )

  // ── Monthly report submissions ─────────────────────────────────────────────
  const reportTotals = { approved: 0, underReview: 0, returned: 0 }
  for (const row of statistics.reports) {
    for (const outcome of REPORT_OUTCOME_ORDER) {
      reportTotals[outcome] += row.outcomes[outcome] ?? 0
    }
  }
  const reportGrandTotal = REPORT_OUTCOME_ORDER.reduce((sum, o) => sum + reportTotals[o], 0)
  report.heading('Monthly report submissions')
  report.table(
    ['Month', ...REPORT_OUTCOME_ORDER.map((o) => REPORT_OUTCOME_LABELS[o]), 'Total'],
    statistics.reports.map((row) => {
      const total = REPORT_OUTCOME_ORDER.reduce((sum, o) => sum + (row.outcomes[o] ?? 0), 0)
      return [
        row.label,
        ...REPORT_OUTCOME_ORDER.map((o) => formatNumber(row.outcomes[o] ?? 0)),
        formatNumber(total),
      ]
    }),
    {
      numericColumns: [1, 2, 3, 4],
      foot: [
        'Total',
        ...REPORT_OUTCOME_ORDER.map((o) => formatNumber(reportTotals[o])),
        formatNumber(reportGrandTotal),
      ],
      emptyMessage: 'No monthly reports were submitted in this period.',
    },
  )

  // ── Year levels ────────────────────────────────────────────────────────────
  const yearTotals = statistics.yearLevels.reduce(
    (acc, row) => ({ volunteers: acc.volunteers + row.volunteers, active: acc.active + row.active }),
    { volunteers: 0, active: 0 },
  )
  report.heading('Participation by year level')
  report.table(
    ['Year level', 'Volunteers', 'Active in period', 'Active rate'],
    statistics.yearLevels.map((row) => [
      row.yearLevel,
      formatNumber(row.volunteers),
      formatNumber(row.active),
      rate(row.active, row.volunteers),
    ]),
    {
      numericColumns: [1, 2, 3],
      foot: [
        'Total',
        formatNumber(yearTotals.volunteers),
        formatNumber(yearTotals.active),
        rate(yearTotals.active, yearTotals.volunteers),
      ],
      emptyMessage: 'No volunteers with a recorded year level in this period.',
    },
  )

  // ── Top events ─────────────────────────────────────────────────────────────
  report.heading('Top events', 'Ranked by attendance')
  report.table(
    ['#', 'Event', 'Category', 'Date', 'Registrations', 'Attended', 'Rate', 'Service hours'],
    statistics.topEvents.map((event, index) => [
      String(index + 1),
      event.title,
      event.category,
      dayjs(event.date).format(PDF_DATE_FORMAT),
      formatNumber(event.registrations),
      formatNumber(event.attended),
      rate(event.attended, event.registrations),
      formatNumber(event.serviceHours),
    ]),
    {
      numericColumns: [0, 4, 5, 6, 7],
      columnWidths: { 0: 8, 3: 24 },
      emptyMessage: 'No events were held in this period.',
    },
  )

  const scopeSlug = (statistics.department ?? 'all-departments')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  report.save(
    `${STATISTICS_PDF_FILENAME}-${scopeSlug}-${statistics.range}-${dayjs().format(PDF_FILENAME_DATE_FORMAT)}.pdf`,
  )
}
