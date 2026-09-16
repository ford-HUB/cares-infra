import dayjs from 'dayjs'
import {
  STATISTICS_CATEGORY_ALL,
  STATISTICS_RANGE_MONTHS,
  STATISTICS_TOP_EVENTS,
} from '../constants/department-statistics'
import { MOCK_API_DELAY_MS, delay } from '../constants/durations'
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER } from '../constants/monthly-report'
import type {
  CategoryActivity,
  DepartmentActivity,
  DepartmentStatistics,
  MonthlyActivity,
  MonthlyReportActivity,
  StatisticSummary,
  StatisticsRange,
  TopEvent,
  YearLevelParticipation,
} from '../types/department-statistics'
import type { ApiResponse } from '../types/portal-roles'

/**
 * Fixture until the department statistics endpoint lands. The shape is the one the
 * store and charts consume, so the swap is a body-only change to an `apiClient` call
 * carrying `range` and `category` as query params. Numbers are generated from a
 * seed, not random — the same request always draws the same chart.
 */

export interface DepartmentStatisticsQuery {
  range: StatisticsRange
  category: string
}

/** Event categories the events form offers; the fixture spreads activity over them. */
const CATEGORIES = ['Community', 'Environment', 'Health', 'Outreach', 'Training'] as const

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'] as const

/** Twelve months of history is generated once; each range is a slice of it. */
const HISTORY_MONTHS = 12

/** Deterministic pseudo-random in [0, 1) — a tiny LCG seeded per series. */
function sequence(seed: number) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

/**
 * A college's share of the whole system. The fixture scales one department's
 * activity up by the number of colleges when the scope is every department.
 */
const SYSTEM_SCALE = DEPARTMENT_ORDER.length

function buildMonthly(department: string | null, category: string): MonthlyActivity[] {
  const seed =
    (category === STATISTICS_CATEGORY_ALL ? 7 : category.length * 31) +
    (department ? department.length * 17 : 3)
  const next = sequence(seed)
  const scale =
    (category === STATISTICS_CATEGORY_ALL ? 1 : 1 / CATEGORIES.length) *
    (department ? 1 : SYSTEM_SCALE)
  const start = dayjs()
    .startOf('month')
    .subtract(HISTORY_MONTHS - 1, 'month')

  return Array.from({ length: HISTORY_MONTHS }, (_, index) => {
    const month = start.add(index, 'month')
    // A gentle upward drift with a dip mid-year, so the trend has a story to tell.
    const season = 1 + 0.25 * Math.sin((index / HISTORY_MONTHS) * Math.PI * 2)
    const eventsHeld = Math.max(1, Math.round((3 + next() * 4) * season * scale))
    const registrations = Math.round(eventsHeld * (18 + next() * 14))
    const attended = Math.round(registrations * (0.72 + next() * 0.2))
    return {
      period: month.format('YYYY-MM'),
      label: month.format('MMM'),
      eventsHeld,
      registrations,
      attended,
      serviceHours: Math.round(attended * (3.5 + next() * 2)),
    }
  })
}

function summarise(current: number[], previous: number[]): StatisticSummary {
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
  return {
    value: sum(current),
    previous: previous.length ? sum(previous) : null,
    trend: current,
  }
}

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0
}

function buildCategories(
  months: MonthlyActivity[],
  category: string,
): CategoryActivity[] {
  const next = sequence(months.length * 13)
  const totalEvents = months.reduce((sum, month) => sum + month.eventsHeld, 0)
  const totalRegistrations = months.reduce((sum, month) => sum + month.registrations, 0)
  const pool =
    category === STATISTICS_CATEGORY_ALL
      ? [...CATEGORIES]
      : CATEGORIES.filter((name) => name === category)
  const weights = pool.map(() => 0.6 + next())
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)

  return pool.map((name, index) => {
    const share = weights[index] / weightSum
    const registrations = Math.round(totalRegistrations * share)
    const completed = Math.round(registrations * (0.7 + next() * 0.2))
    const absent = Math.round((registrations - completed) * (0.5 + next() * 0.4))
    return {
      category: name,
      events: Math.max(1, Math.round(totalEvents * share)),
      registrations,
      outcomes: { completed, pending: registrations - completed - absent, absent },
    }
  })
}

function buildReports(months: MonthlyActivity[]): MonthlyReportActivity[] {
  const next = sequence(97)
  return months.map((month) => {
    const roll = next()
    return {
      period: month.period,
      label: month.label,
      outcomes: {
        approved: roll > 0.25 ? 1 : 0,
        underReview: roll <= 0.25 && roll > 0.1 ? 1 : 0,
        returned: roll <= 0.1 ? 1 : 0,
      },
    }
  })
}

function buildYearLevels(): YearLevelParticipation[] {
  const next = sequence(41)
  return YEAR_LEVELS.map((yearLevel) => {
    const volunteers = 20 + Math.round(next() * 40)
    return {
      yearLevel,
      volunteers,
      active: Math.round(volunteers * (0.45 + next() * 0.45)),
    }
  })
}

/** The fixture never claims an event already ran on a date still to come. */
function clampToToday(date: dayjs.Dayjs): string {
  const today = dayjs()
  return (date.isAfter(today) ? today : date).toISOString()
}

function buildTopEvents(months: MonthlyActivity[], category: string): TopEvent[] {
  const next = sequence(months.length * 7 + category.length)
  const titles = [
    'Coastal Clean-up Drive',
    'Blood Donation Day',
    'Barangay Literacy Program',
    'Tree Planting Initiative',
    'First Aid Training',
    'Feeding Program',
    'Digital Literacy Workshop',
    'Relief Goods Repacking',
  ]
  const pool =
    category === STATISTICS_CATEGORY_ALL
      ? [...CATEGORIES]
      : CATEGORIES.filter((name) => name === category)

  return titles
    .map((title, index) => {
      const month = months[Math.floor(next() * months.length)]
      const registrations = 24 + Math.round(next() * 60)
      const attended = Math.round(registrations * (0.6 + next() * 0.38))
      return {
        id: `evt-${index + 1}`,
        title,
        category: pool[index % pool.length],
        date: clampToToday(dayjs(month.period).date(1 + Math.floor(next() * 27))),
        registrations,
        attended,
        serviceHours: Math.round(attended * (3 + next() * 3)),
      }
    })
    .sort((a, b) => b.attended - a.attended)
    .slice(0, STATISTICS_TOP_EVENTS)
}

/** How the whole splits by college — only meaningful when the scope is every department. */
function buildDepartments(months: MonthlyActivity[]): DepartmentActivity[] {
  const next = sequence(months.length * 5)
  const totals = months.reduce(
    (sum, month) => ({
      events: sum.events + month.eventsHeld,
      registrations: sum.registrations + month.registrations,
      attended: sum.attended + month.attended,
      serviceHours: sum.serviceHours + month.serviceHours,
    }),
    { events: 0, registrations: 0, attended: 0, serviceHours: 0 },
  )
  const weights = DEPARTMENT_ORDER.map(() => 0.5 + next())
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)

  return DEPARTMENT_ORDER.map((code, index) => {
    const share = weights[index] / weightSum
    return {
      department: DEPARTMENT_LABELS[code],
      events: Math.max(1, Math.round(totals.events * share)),
      registrations: Math.round(totals.registrations * share),
      attended: Math.round(totals.attended * share),
      serviceHours: Math.round(totals.serviceHours * share),
    }
  })
}

/**
 * `department` null reads the whole system — the admin and director view. A
 * coordinator always passes their own college.
 */
export async function getDepartmentStatistics(
  department: string | null,
  query: DepartmentStatisticsQuery,
): Promise<ApiResponse<DepartmentStatistics>> {
  await delay(MOCK_API_DELAY_MS.default)

  const months = STATISTICS_RANGE_MONTHS[query.range]
  const history = buildMonthly(department, query.category)
  const current = history.slice(-months)
  const previous = history.slice(-months * 2, -months)

  const attendanceRate = (rows: MonthlyActivity[]) =>
    rate(
      rows.reduce((sum, row) => sum + row.attended, 0),
      rows.reduce((sum, row) => sum + row.registrations, 0),
    )

  // Active volunteers is a distinct-count on the server; the fixture approximates it as
  // a share of registrations so the number moves with the period like the real one will.
  const activeFrom = (rows: MonthlyActivity[]) =>
    rows.map((row) => Math.round(row.attended * 0.55))

  return {
    success: true,
    data: {
      department,
      range: query.range,
      summary: {
        eventsHeld: summarise(
          current.map((row) => row.eventsHeld),
          previous.map((row) => row.eventsHeld),
        ),
        activeVolunteers: summarise(activeFrom(current), activeFrom(previous)),
        attendanceRate: {
          value: attendanceRate(current),
          previous: previous.length ? attendanceRate(previous) : null,
          trend: current.map((row) => rate(row.attended, row.registrations)),
        },
        serviceHours: summarise(
          current.map((row) => row.serviceHours),
          previous.map((row) => row.serviceHours),
        ),
      },
      monthly: current,
      categories: buildCategories(current, query.category),
      reports: buildReports(current),
      yearLevels: buildYearLevels(),
      topEvents: buildTopEvents(current, query.category),
      departments: department ? [] : buildDepartments(current),
      generatedAt: new Date().toISOString(),
    },
  }
}

/** Category choices for the filter — the fixture's set until the endpoint reports them. */
export const DEPARTMENT_STATISTICS_CATEGORIES: readonly string[] = CATEGORIES

/** Department choices for the director-level filter — the report colleges. */
export const DEPARTMENT_STATISTICS_DEPARTMENTS: readonly string[] = DEPARTMENT_ORDER.map(
  (code) => DEPARTMENT_LABELS[code],
)
