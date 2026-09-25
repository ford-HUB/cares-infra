import {
  DEPARTMENT_RANKING_BASES,
  formatHours,
  formatPoints,
  formatScore,
} from '../constants/ranking'
import { formatCurrency, formatNumber } from '../constants/formatting'
import type {
  DepartmentRankingBasis,
  DisplayedDepartment,
  DonorRankingEntry,
  RankingBoard,
  RankingLeader,
  RankingSettings,
  VolunteerRankingEntry,
} from '../types/ranking'

export interface RankingTile {
  label: string
  value: string
  hint: string
}

interface DashboardInput {
  board: RankingBoard
  settings: RankingSettings
  volunteers: VolunteerRankingEntry[]
  donors: DonorRankingEntry[]
  /** Already ordered on `departmentBasis`. */
  departments: DisplayedDepartment[]
  departmentBasis: DepartmentRankingBasis
  departmentUnattributed: { hours: number; donationAmount: number }
  scopeDepartment: string | null
}

const PODIUM_SIZE = 3

function sum<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((total, row) => total + pick(row), 0)
}

/** A college's podium figure is whatever the board is currently ordered on. */
function departmentFigure(entry: DisplayedDepartment, basis: DepartmentRankingBasis): string {
  if (basis === 'hours') return formatHours(entry.hours)
  if (basis === 'donations') return formatCurrency(entry.donationAmount)
  return formatScore(entry.score)
}

/**
 * The headline tiles and podium for the active board. Every board maps into the
 * same podium shape so the podium stays criteria-agnostic.
 */
export function rankingDashboard({
  board,
  settings,
  volunteers,
  donors,
  departments,
  departmentBasis,
  departmentUnattributed,
  scopeDepartment,
}: DashboardInput): { tiles: RankingTile[]; leaders: RankingLeader[] } {
  if (board === 'volunteer') {
    const leaders = volunteers.slice(0, PODIUM_SIZE).map((entry) => ({
      id: entry.id,
      rank: entry.rank,
      name: `${entry.firstName} ${entry.lastName}`,
      subtitle: `${formatNumber(entry.eventsJoined)} attended`,
      figure: formatPoints(entry.points),
    }))
    const leader = leaders.find((entry) => entry.rank === 1)
    return {
      leaders,
      tiles: [
        {
          label: 'Ranked Volunteers',
          value: formatNumber(volunteers.length),
          hint: scopeDepartment
            ? `${scopeDepartment} + school-wide events · ${settings.pointsPerAttendance} pts per attendance`
            : `Scored at ${settings.pointsPerAttendance} points per attendance`,
        },
        {
          label: 'Events Attended',
          value: formatNumber(sum(volunteers, (entry) => entry.eventsJoined)),
          hint: `${formatPoints(sum(volunteers, (entry) => entry.points))} on the board · ${formatNumber(
            sum(volunteers, (entry) => entry.eventsMissed),
          )} missed cost ${formatPoints(sum(volunteers, (entry) => entry.pointsDeducted))}`,
        },
        {
          label: 'Top Volunteer',
          value: leader?.name ?? '—',
          hint: leader?.figure ?? 'No standings yet',
        },
      ],
    }
  }

  if (board === 'donor') {
    const leaders = donors.slice(0, PODIUM_SIZE).map((entry) => ({
      id: entry.id,
      rank: entry.rank,
      name: entry.name,
      subtitle: formatCurrency(entry.amount),
      figure: formatPoints(entry.points),
    }))
    const leader = leaders.find((entry) => entry.rank === 1)
    return {
      leaders,
      tiles: [
        {
          label: 'Ranked Donors',
          value: formatNumber(donors.length),
          hint: `Scored at 1 point per ₱${settings.donorPesosPerPoint} donated`,
        },
        {
          label: 'Total Donated',
          value: formatCurrency(sum(donors, (entry) => entry.amount)),
          hint: `${formatPoints(sum(donors, (entry) => entry.points))} awarded in total`,
        },
        {
          label: 'Top Donor',
          value: leader?.name ?? '—',
          hint: leader?.figure ?? 'No standings yet',
        },
      ],
    }
  }

  // A college with nothing on the current order is on the table, but not on the
  // podium — and since it sorts last, the podium's ranks stay 1, 2, 3.
  const onPodium = departments.filter((entry) =>
    departmentBasis === 'hours'
      ? entry.hours > 0
      : departmentBasis === 'donations'
        ? entry.donationAmount > 0
        : entry.score > 0,
  )
  const active = departments.filter((entry) => entry.hours > 0 || entry.donationAmount > 0)
  const leaders = onPodium.slice(0, PODIUM_SIZE).map((entry) => ({
    id: entry.id,
    rank: entry.rank,
    name: entry.name,
    subtitle:
      departmentBasis === 'donations'
        ? `${formatNumber(entry.donations)} donations`
        : `${formatHours(entry.hours)} · ${formatCurrency(entry.donationAmount)}`,
    figure: departmentFigure(entry, departmentBasis),
    badge: entry.code ?? undefined,
  }))
  const leader = leaders.find((entry) => entry.rank === 1)
  const basisLabel =
    DEPARTMENT_RANKING_BASES.find((item) => item.value === departmentBasis)?.label ?? ''

  return {
    leaders,
    tiles: [
      {
        label: 'Service Hours',
        value: formatHours(sum(departments, (entry) => entry.hours)),
        hint: `${formatNumber(sum(departments, (entry) => entry.volunteers))} volunteers across ${formatNumber(
          active.length,
        )} of ${formatNumber(departments.length)} departments${
          departmentUnattributed.hours > 0
            ? ` · ${formatHours(departmentUnattributed.hours)} with no college on file`
            : ''
        }`,
      },
      {
        label: 'Donations Credited',
        value: formatCurrency(sum(departments, (entry) => entry.donationAmount)),
        hint: `Given to departments' events${
          departmentUnattributed.donationAmount > 0
            ? ` · ${formatCurrency(departmentUnattributed.donationAmount)} more to school-wide events`
            : ''
        }`,
      },
      {
        label: 'Top Department',
        value: leader?.name ?? '—',
        hint: leader ? `${leader.figure} · ranked on ${basisLabel.toLowerCase()}` : 'No standings yet',
      },
    ],
  }
}
