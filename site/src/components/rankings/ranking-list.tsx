import {
  ALL_DEPARTMENTS,
  DEPARTMENT_RANKING_BASES,
  DONOR_KIND_FILTERS,
  RANKING_SEARCH_PLACEHOLDERS,
} from '../../constants/ranking'
import type {
  DepartmentRankingBasis,
  DisplayedDepartment,
  DonorKindFilter,
  DonorRankingEntry,
  RankingBoard,
  RankingSettings,
  VolunteerRankingEntry,
} from '../../types/ranking'
import { DepartmentRankingTable } from './department-ranking-table'
import { DonorRankingTable } from './donor-ranking-table'
import { RankingListToolbar, type RankingListFilter } from './ui/ranking-list-toolbar'
import { VolunteerRankingTable } from './volunteer-ranking-table'

export interface RankingListProps {
  board: RankingBoard
  settings: RankingSettings
  loading: boolean
  /** Whole boards, for the "x of y" count. */
  totals: Record<RankingBoard, number>
  volunteers: VolunteerRankingEntry[]
  donors: DonorRankingEntry[]
  departments: DisplayedDepartment[]
  search: string
  onSearchChange: (value: string) => void
  volunteerDepartment: string
  volunteerDepartments: string[]
  onVolunteerDepartmentChange: (value: string) => void
  donorKind: DonorKindFilter
  onDonorKindChange: (value: DonorKindFilter) => void
  departmentBasis: DepartmentRankingBasis
  onDepartmentBasisChange: (value: DepartmentRankingBasis) => void
}

const NOUNS: Record<RankingBoard, string> = {
  volunteer: 'volunteers',
  donor: 'donors',
  department: 'departments',
}

const NO_MATCH = 'Nothing on this board matches the search or filter.'

/** The Ranking List tab: search and the board's filter above its standings. */
export function RankingList({
  board,
  settings,
  loading,
  totals,
  volunteers,
  donors,
  departments,
  search,
  onSearchChange,
  volunteerDepartment,
  volunteerDepartments,
  onVolunteerDepartmentChange,
  donorKind,
  onDonorKindChange,
  departmentBasis,
  onDepartmentBasisChange,
}: RankingListProps) {
  // Each board filters on what sets its rows apart: a volunteer's college, how a
  // donor gave, and which figure the colleges are ordered on.
  const filters: Record<RankingBoard, RankingListFilter> = {
    volunteer: {
      label: 'Filter by department',
      value: volunteerDepartment,
      options: [
        { value: ALL_DEPARTMENTS, label: 'All departments' },
        ...volunteerDepartments.map((name) => ({ value: name, label: name })),
      ],
      onChange: onVolunteerDepartmentChange,
    },
    donor: {
      label: 'Filter by donation kind',
      value: donorKind,
      options: DONOR_KIND_FILTERS,
      onChange: (value) => onDonorKindChange(value as DonorKindFilter),
    },
    department: {
      label: 'Rank departments by',
      value: departmentBasis,
      options: DEPARTMENT_RANKING_BASES.map((item) => ({
        value: item.value,
        label: `Rank by: ${item.label}`,
      })),
      onChange: (value) => onDepartmentBasisChange(value as DepartmentRankingBasis),
    },
  }

  const shown =
    board === 'volunteer'
      ? volunteers.length
      : board === 'donor'
        ? donors.length
        : departments.length
  const narrowed = shown < totals[board]

  return (
    <>
      <RankingListToolbar
        search={search}
        placeholder={RANKING_SEARCH_PLACEHOLDERS[board]}
        onSearchChange={onSearchChange}
        filter={filters[board]}
        shown={shown}
        total={totals[board]}
        noun={NOUNS[board]}
      />

      {board === 'volunteer' ? (
        <VolunteerRankingTable
          entries={volunteers}
          tiers={settings.tiers}
          settings={settings}
          loading={loading}
          emptyMessage={narrowed ? NO_MATCH : undefined}
        />
      ) : board === 'donor' ? (
        <DonorRankingTable
          entries={donors}
          tiers={settings.tiers}
          loading={loading}
          emptyMessage={narrowed ? NO_MATCH : undefined}
        />
      ) : (
        <DepartmentRankingTable
          entries={departments}
          basis={departmentBasis}
          tiers={settings.tiers}
          loading={loading}
          emptyMessage={narrowed ? NO_MATCH : 'No department is on file yet.'}
        />
      )}
    </>
  )
}
