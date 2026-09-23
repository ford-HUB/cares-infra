import dayjs from 'dayjs'
import { formatDateShort, formatNumber, formatPercent } from '../constants/formatting'
import {
  PDF_FILENAME_DATE_FORMAT,
  PDF_GENERATED_AT_FORMAT,
  RESIDENTIAL_NEEDS_PDF_FILENAME,
} from '../constants/pdf-export'
import {
  COMMUNITY_PROBLEM_LABELS,
  COMMUNITY_PROBLEM_ORDER,
  NEED_BARRIER_LABELS,
  NEED_BARRIER_ORDER,
  NEED_CATEGORY_LABELS,
  NEED_CATEGORY_ORDER,
  NEED_PRIORITY_LABELS,
  NEED_PRIORITY_ORDER,
  NEED_SERIOUSNESS_LABELS,
  NEEDS_FILTER_ALL,
  NEEDS_SURVEY_SOURCE_LABEL,
} from '../constants/residential-needs'
import { householdPriority } from '../services/residential-needs-mock'
import type { Household, NeedPriority } from '../types/residential-needs'
import { PdfReport } from './pdf/pdf-report'

interface ResidentialNeedsPdfOptions {
  /** The barangay picker in force; `NEEDS_FILTER_ALL` when unfiltered. */
  barangay: string
  /** The priority band in force; `NEEDS_FILTER_ALL` when unfiltered. */
  priority: NeedPriority | typeof NEEDS_FILTER_ALL
}

function share(part: number, whole: number) {
  return whole > 0 ? formatPercent(part / whole) : '—'
}

function priorityCounts(households: Household[]) {
  const counts = Object.fromEntries(NEED_PRIORITY_ORDER.map((band) => [band, 0])) as Record<
    NeedPriority,
    number
  >
  households.forEach((h) => {
    counts[householdPriority(h)] += 1
  })
  return counts
}

/**
 * The Residential Needs overview as a printable report: how urgent the survey is,
 * where the need concentrates, what households lack and why they cannot meet it,
 * then every household row — the figures behind the charts, not pictures of them.
 * `scoped` is what the barangay picker left; `visible` is that narrowed further by
 * the priority band, and is what the household list prints.
 */
export function exportResidentialNeedsPdf(
  scoped: Household[],
  visible: Household[],
  { barangay, priority }: ResidentialNeedsPdfOptions,
) {
  const report = new PdfReport()
  const counts = priorityCounts(scoped)
  const urgent = counts.critical + counts.high
  const total = scoped.length

  report.title('Residential Needs Report', `Household survey across partner barangays — ${NEEDS_SURVEY_SOURCE_LABEL}`, [
    { label: 'Barangay', value: barangay === NEEDS_FILTER_ALL ? 'All barangays' : barangay },
    {
      label: 'Priority',
      value: priority === NEEDS_FILTER_ALL ? 'All priorities' : NEED_PRIORITY_LABELS[priority],
    },
    { label: 'Households', value: formatNumber(total) },
    { label: 'Generated', value: dayjs().format(PDF_GENERATED_AT_FORMAT) },
  ])

  // ── Headline figures ────────────────────────────────────────────────────────
  const topNeed = NEED_CATEGORY_ORDER.reduce((top, need) => {
    const tally = (key: typeof need) => scoped.filter((h) => h.survey.needs.includes(key)).length
    return tally(need) > tally(top) ? need : top
  })
  const members = scoped.reduce((sum, h) => sum + h.members, 0)
  report.heading('Summary')
  report.facts([
    {
      label: 'Households surveyed',
      value: formatNumber(total),
      note: `${formatNumber(members)} family members`,
    },
    {
      label: 'Need urgent help',
      value: formatNumber(urgent),
      note: `${share(urgent, total)} critical or high`,
    },
    {
      label: 'Most common need',
      value: NEED_CATEGORY_LABELS[topNeed],
      note: `${share(scoped.filter((h) => h.survey.needs.includes(topNeed)).length, total)} of households`,
    },
    {
      label: 'Barangays covered',
      value: formatNumber(new Set(scoped.map((h) => h.barangay)).size),
    },
  ])

  // ── Priority split ─────────────────────────────────────────────────────────
  report.heading('Households by priority', 'From how serious each household rates its main need')
  report.table(
    ['Priority', 'Households', 'Share'],
    NEED_PRIORITY_ORDER.map((band) => [
      NEED_PRIORITY_LABELS[band],
      formatNumber(counts[band]),
      share(counts[band], total),
    ]),
    { numericColumns: [1, 2], foot: ['Total', formatNumber(total), share(total, total)] },
  )

  // ── Where the need concentrates ────────────────────────────────────────────
  const barangays = [...new Set(scoped.map((h) => h.barangay))].sort((a, b) =>
    a.localeCompare(b),
  )
  report.heading('Priority by barangay', 'Where urgent households concentrate')
  report.table(
    ['Barangay', ...NEED_PRIORITY_ORDER.map((band) => NEED_PRIORITY_LABELS[band]), 'Total', 'Urgent share'],
    barangays.map((name) => {
      const rows = scoped.filter((h) => h.barangay === name)
      const local = priorityCounts(rows)
      return [
        name,
        ...NEED_PRIORITY_ORDER.map((band) => formatNumber(local[band])),
        formatNumber(rows.length),
        share(local.critical + local.high, rows.length),
      ]
    }),
    {
      numericColumns: [1, 2, 3, 4, 5, 6],
      foot: [
        'Total',
        ...NEED_PRIORITY_ORDER.map((band) => formatNumber(counts[band])),
        formatNumber(total),
        share(urgent, total),
      ],
      emptyMessage: 'No households in this scope.',
    },
  )

  // ── The three multiple-choice questions ────────────────────────────────────
  report.heading('What households need help with', 'One household can select several')
  report.table(
    ['Need', 'Households', 'Share'],
    NEED_CATEGORY_ORDER.map((need) => {
      const count = scoped.filter((h) => h.survey.needs.includes(need)).length
      return [NEED_CATEGORY_LABELS[need], formatNumber(count), share(count, total)]
    }),
    { numericColumns: [1, 2] },
  )

  report.heading('What makes needs hard to meet', 'One household can name several')
  report.table(
    ['Difficulty', 'Households', 'Share'],
    NEED_BARRIER_ORDER.map((barrier) => {
      const count = scoped.filter((h) => h.survey.barriers.includes(barrier)).length
      return [NEED_BARRIER_LABELS[barrier], formatNumber(count), share(count, total)]
    }),
    { numericColumns: [1, 2] },
  )

  report.heading('Problems seen in the community', 'The one problem each household most commonly observes')
  report.table(
    ['Problem', 'Households', 'Share'],
    COMMUNITY_PROBLEM_ORDER.map((problem) => {
      const count = scoped.filter((h) => h.survey.communityProblem === problem).length
      return [COMMUNITY_PROBLEM_LABELS[problem], formatNumber(count), share(count, total)]
    }),
    { numericColumns: [1, 2], foot: ['Total', formatNumber(total), share(total, total)] },
  )

  // ── Every household ────────────────────────────────────────────────────────
  const listNote =
    priority === NEEDS_FILTER_ALL
      ? `${formatNumber(visible.length)} households`
      : `${formatNumber(visible.length)} of ${formatNumber(total)} · ${NEED_PRIORITY_LABELS[priority].toLowerCase()}`
  report.heading('Households', listNote)
  report.table(
    ['Family', 'Barangay', 'Members', 'Priority', 'Seriousness', 'Needs', 'Difficulties', 'Surveyed'],
    visible.map((h) => [
      h.familyName,
      h.barangay,
      formatNumber(h.members),
      NEED_PRIORITY_LABELS[householdPriority(h)],
      NEED_SERIOUSNESS_LABELS[h.survey.seriousness],
      h.survey.needs.map((need) => NEED_CATEGORY_LABELS[need]).join(', '),
      h.survey.barriers.map((barrier) => NEED_BARRIER_LABELS[barrier]).join(', '),
      formatDateShort(h.surveyedAt),
    ]),
    {
      numericColumns: [2],
      columnWidths: { 2: 16, 3: 18, 7: 22 },
      emptyMessage: 'No households match the current filters.',
    },
  )

  const scopeSlug = (barangay === NEEDS_FILTER_ALL ? 'all-barangays' : barangay)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  report.save(
    `${RESIDENTIAL_NEEDS_PDF_FILENAME}-${scopeSlug}-${dayjs().format(PDF_FILENAME_DATE_FORMAT)}.pdf`,
  )
}
