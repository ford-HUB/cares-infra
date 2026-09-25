import { ContentShell } from '../../components/portal/ui/content-shell'
import { RankingsBoard } from '../../components/rankings/rankings-board'
import { useRankings } from '../../hooks/use-rankings'

export function RankingsPage() {
  const rankings = useRankings()

  return (
    <ContentShell variant="full">
      <RankingsBoard
        view={rankings.view}
        board={rankings.board}
        boards={rankings.boards}
        period={rankings.period}
        settings={rankings.settings}
        dashboard={{
          volunteers: rankings.volunteers,
          donors: rankings.donors,
          departments: rankings.departments,
          departmentBasis: rankings.departmentBasis,
          departmentUnattributed: rankings.departmentUnattributed,
          scopeDepartment: rankings.scopeDepartment,
        }}
        volunteerTrend={rankings.volunteerTrend}
        donorTrend={rankings.donorTrend}
        list={{
          totals: {
            volunteer: rankings.volunteers.length,
            donor: rankings.donors.length,
            department: rankings.departments.length,
          },
          volunteers: rankings.filteredVolunteers,
          donors: rankings.filteredDonors,
          departments: rankings.filteredDepartments,
          search: rankings.search,
          onSearchChange: rankings.setSearch,
          volunteerDepartment: rankings.volunteerDepartment,
          volunteerDepartments: rankings.volunteerDepartments,
          onVolunteerDepartmentChange: rankings.setVolunteerDepartment,
          donorKind: rankings.donorKind,
          onDonorKindChange: rankings.setDonorKind,
          departmentBasis: rankings.departmentBasis,
          onDepartmentBasisChange: rankings.setDepartmentBasis,
        }}
        error={rankings.error}
        loading={rankings.loading}
        onViewChange={rankings.setView}
        onBoardChange={rankings.setBoard}
        onPeriodChange={rankings.setPeriod}
      />
    </ContentShell>
  )
}
