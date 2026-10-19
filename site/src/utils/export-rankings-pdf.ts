import dayjs from 'dayjs'
import { formatNumber } from '../constants/formatting'
import {
  PDF_DATE_FORMAT,
  PDF_FILENAME_DATE_FORMAT,
  RANKINGS_PDF_FILENAME,
} from '../constants/pdf-export'
import {
  DEPARTMENT_RANKING_BASES,
  DONOR_KIND_FILTERS,
  PARTICIPATION_ROLE_OPTIONS,
  RANKING_BOARDS,
  RANKING_PERIODS,
  boardCriteria,
  tierForRank,
} from '../constants/ranking'
import type {
  DepartmentRankingBasis,
  DisplayedDepartment,
  DonorKindFilter,
  DonorRankingEntry,
  RankingBoard,
  RankingPeriod,
  RankingSettings,
  VolunteerRankingEntry,
} from '../types/ranking'
import { PdfReport } from './pdf/pdf-report'

interface RankingsPdfOptions {
  board: RankingBoard
  period: RankingPeriod
  settings: RankingSettings
  /** The college a coordinator's board is cut to; null for the whole school. */
  scopeDepartment: string | null
  /** The rows the Ranking List shows — already searched and filtered. */
  volunteers: VolunteerRankingEntry[]
  donors: DonorRankingEntry[]
  departments: DisplayedDepartment[]
  /** Whole boards, for the "N of M" line. */
  totals: Record<RankingBoard, number>
  search: string
  volunteerDepartment: string
  donorKind: DonorKindFilter
  departmentBasis: DepartmentRankingBasis
  /** Hours and pesos no college could be credited with. */
  departmentUnattributed: { hours: number; donationAmount: number }
}

/** The PDF's built-in font has no peso sign, so amounts print with the code. */
function pesos(value: number) {
  return `PHP ${formatNumber(value)}`
}

/** Swaps the glyphs the built-in font cannot draw for ones it can. */
function printable(text: string) {
  return text.replace(/₱/g, 'PHP ').replace(/−/g, '-')
}

function date(value: string | null) {
  return value ? dayjs(value).format(PDF_DATE_FORMAT) : '—'
}

function labelOf<T extends string>(items: { value: T; label: string }[], value: T) {
  return items.find((item) => item.value === value)?.label ?? value
}

function sum<T>(rows: T[], pick: (row: T) => number) {
  return rows.reduce((total, row) => total + pick(row), 0)
}

/**
 * The active Rankings board as a report: the scoring rule and filters that
 * produced it, headline totals, then the standings in the order the Ranking List
 * shows them. Each row keeps the rank it earned on the whole board, so a filtered
 * export still reads true. Landscape, for the volunteer board's breakdown columns.
 */
export function exportRankingsPdf(options: RankingsPdfOptions) {
  const { board, period, settings, totals } = options
  const report = new PdfReport({ landscape: true })
  const boardLabel = labelOf(RANKING_BOARDS, board)
  const shown =
    board === 'volunteer'
      ? options.volunteers.length
      : board === 'donor'
        ? options.donors.length
        : options.departments.length

  const filters = [
    options.search.trim() && `Search: "${options.search.trim()}"`,
    board === 'volunteer' &&
      options.volunteerDepartment !== 'all' &&
      `Department: ${options.volunteerDepartment}`,
    board === 'donor' &&
      options.donorKind !== 'all' &&
      labelOf(DONOR_KIND_FILTERS, options.donorKind),
    board === 'department' &&
      `Ranked by: ${labelOf(DEPARTMENT_RANKING_BASES, options.departmentBasis)}`,
  ].filter(Boolean) as string[]

  report.title(`${boardLabel} Rankings Report`, printable(boardCriteria(board, settings)), [
    { label: 'Period', value: labelOf(RANKING_PERIODS, period) },
    {
      label: 'Scope',
      value:
        board === 'volunteer' && options.scopeDepartment
          ? options.scopeDepartment
          : 'Whole school',
    },
    {
      label: 'Entries',
      value:
        shown === totals[board]
          ? `${formatNumber(shown)} (whole board)`
          : `${formatNumber(shown)} of ${formatNumber(totals[board])} after filters`,
    },
    { label: 'Filters', value: filters.length ? filters.join(' · ') : 'None' },
  ])

  if (board === 'volunteer') volunteerSection(report, options)
  else if (board === 'donor') donorSection(report, options)
  else departmentSection(report, options)

  const scopeSlug = (options.scopeDepartment ?? 'all')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  report.save(
    `${RANKINGS_PDF_FILENAME}-${board}-${period}-${scopeSlug}-${dayjs().format(
      PDF_FILENAME_DATE_FORMAT,
    )}.pdf`,
  )
}

function volunteerSection(report: PdfReport, { volunteers, settings }: RankingsPdfOptions) {
  report.heading('Summary')
  report.facts(
    [
      { label: 'Volunteers', value: formatNumber(volunteers.length) },
      { label: 'Events attended', value: formatNumber(sum(volunteers, (v) => v.eventsJoined)) },
      { label: 'Events missed', value: formatNumber(sum(volunteers, (v) => v.eventsMissed)) },
      { label: 'Service hours', value: formatNumber(sum(volunteers, (v) => v.hours)) },
      { label: 'Role points', value: formatNumber(sum(volunteers, (v) => v.rolePoints)) },
      { label: 'Total points', value: formatNumber(sum(volunteers, (v) => v.points)) },
      ...PARTICIPATION_ROLE_OPTIONS.map((role) => {
        const served = volunteers.filter((v) => v.roleCounts[role.id] > 0)
        return {
          label: `${role.label}s`,
          value: formatNumber(served.length),
          note: `${formatNumber(sum(served, (v) => v.roleCounts[role.id]))} events served`,
        }
      }),
    ],
    6,
  )

  report.heading('Scoring Criteria')
  report.table(
    ['Criterion', 'Points'],
    [
      ['Per event attended', `+${formatNumber(settings.pointsPerAttendance)}`],
      ...PARTICIPATION_ROLE_OPTIONS.map((role) => [
        `Participation role — ${role.label} (approved)`,
        `+${formatNumber(settings.participationRolePoints[role.id] ?? 0)}`,
      ]),
      [
        `Missed registration (grows per straight miss within ${settings.absenceResetDays} days)`,
        `-${formatNumber(settings.absencePenaltyStep)}`,
      ],
    ],
    { numericColumns: [1], columnWidths: { 1: 30 } },
  )

  report.heading('Standings', `${volunteers.length} listed`)
  report.table(
    [
      'Rank',
      'Volunteer',
      'Department',
      'Tier',
      'Attended',
      'Missed',
      'Org.',
      'Facil.',
      'Speaker',
      'Hours',
      'Earned',
      'Role pts',
      'Deducted',
      'Points',
      'Last Active',
    ],
    volunteers.map((entry) => [
      String(entry.rank),
      `${entry.firstName} ${entry.lastName}\n${entry.email}`,
      entry.department,
      tierForRank(entry.rank, settings.tiers).label,
      formatNumber(entry.eventsJoined),
      formatNumber(entry.eventsMissed),
      formatNumber(entry.roleCounts.ORGANIZER),
      formatNumber(entry.roleCounts.FACILITATOR),
      formatNumber(entry.roleCounts.SPEAKER),
      formatNumber(entry.hours),
      `+${formatNumber(entry.pointsEarned)}`,
      `+${formatNumber(entry.rolePoints)}`,
      `-${formatNumber(entry.pointsDeducted)}`,
      formatNumber(entry.points),
      date(entry.lastActiveAt),
    ]),
    {
      numericColumns: [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      columnWidths: { 0: 11, 1: 50, 2: 34, 3: 18, 14: 22 },
      emptyMessage: 'No volunteer matches the current filters.',
    },
  )

  // One list per role, so a director can see at a glance who organised,
  // facilitated or spoke — with each volunteer's overall standing beside it.
  for (const role of PARTICIPATION_ROLE_OPTIONS) {
    const served = volunteers
      .filter((v) => v.roleCounts[role.id] > 0)
      .sort((a, b) => b.roleCounts[role.id] - a.roleCounts[role.id] || a.rank - b.rank)
    report.heading(`${role.label}s`, `${served.length} listed`)
    report.table(
      ['Rank', 'Volunteer', 'Department', `Events as ${role.label}`, 'Role pts earned', 'Points'],
      served.map((entry) => [
        String(entry.rank),
        `${entry.firstName} ${entry.lastName}
${entry.email}`,
        entry.department,
        formatNumber(entry.roleCounts[role.id]),
        `+${formatNumber(
          entry.roleCounts[role.id] * (settings.participationRolePoints[role.id] ?? 0),
        )}`,
        formatNumber(entry.points),
      ]),
      {
        numericColumns: [0, 3, 4, 5],
        columnWidths: { 0: 14, 1: 80, 2: 60 },
        emptyMessage: `No volunteer served as ${role.label} in this period.`,
      },
    )
  }
}

function donorSection(report: PdfReport, { donors, settings }: RankingsPdfOptions) {
  report.heading('Summary')
  report.facts(
    [
      { label: 'Donors', value: formatNumber(donors.length) },
      { label: 'Confirmed total', value: pesos(sum(donors, (d) => d.amount)) },
      { label: 'Money', value: pesos(sum(donors, (d) => d.moneyAmount)) },
      { label: 'Goods value', value: pesos(sum(donors, (d) => d.goodsAmount)) },
      { label: 'Donations', value: formatNumber(sum(donors, (d) => d.donations)) },
      { label: 'Total points', value: formatNumber(sum(donors, (d) => d.points)) },
    ],
    6,
  )

  report.heading('Standings', `${donors.length} listed`)
  report.table(
    ['Rank', 'Donor', 'Tier', 'Amount', 'Money', 'Goods', 'Donations', 'Last Donation', 'Points'],
    donors.map((entry) => [
      String(entry.rank),
      `${entry.name}\n${entry.email}`,
      tierForRank(entry.rank, settings.tiers).label,
      pesos(entry.amount),
      pesos(entry.moneyAmount),
      pesos(entry.goodsAmount),
      formatNumber(entry.donations),
      date(entry.lastDonatedAt),
      formatNumber(entry.points),
    ]),
    {
      numericColumns: [0, 3, 4, 5, 6, 8],
      columnWidths: { 0: 12, 1: 70, 2: 22 },
      emptyMessage: 'No donor matches the current filters.',
    },
  )
}

function departmentSection(
  report: PdfReport,
  { departments, settings, departmentUnattributed }: RankingsPdfOptions,
) {
  report.heading('Summary')
  report.facts(
    [
      { label: 'Departments', value: formatNumber(departments.length) },
      { label: 'Volunteers', value: formatNumber(sum(departments, (d) => d.volunteers)) },
      { label: 'Service hours', value: formatNumber(sum(departments, (d) => d.hours)) },
      { label: 'Donations', value: pesos(sum(departments, (d) => d.donationAmount)) },
      {
        label: 'Unattributed',
        value: `${formatNumber(departmentUnattributed.hours)} hrs`,
        note: `${pesos(departmentUnattributed.donationAmount)} school-wide`,
      },
    ],
    5,
  )

  report.heading('Standings', `${departments.length} listed`)
  report.table(
    [
      'Rank',
      'Department',
      'Tier',
      'Volunteers',
      'Events Attended',
      'Service Hours',
      'Donated',
      'Donations',
      'Score',
    ],
    departments.map((entry) => [
      String(entry.rank),
      entry.code ? `${entry.name} (${entry.code})` : entry.name,
      tierForRank(entry.rank, settings.tiers).label,
      formatNumber(entry.volunteers),
      formatNumber(entry.eventsAttended),
      formatNumber(entry.hours),
      pesos(entry.donationAmount),
      formatNumber(entry.donations),
      entry.score.toFixed(1),
    ]),
    {
      numericColumns: [0, 3, 4, 5, 6, 7, 8],
      columnWidths: { 0: 12, 1: 80, 2: 22 },
      emptyMessage: 'No department matches the current filters.',
    },
  )
}
