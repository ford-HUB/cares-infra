import { ContentShell } from '../../components/portal/ui/content-shell'
import { RankingsBoard } from '../../components/rankings/rankings-board'
import { useRankings } from '../../hooks/use-rankings'

export function RankingsPage() {
  const {
    view,
    setView,
    board,
    setBoard,
    period,
    setPeriod,
    settings,
    volunteers,
    donors,
    volunteerTrend,
    donorTrend,
    loading,
  } = useRankings()

  return (
    <ContentShell variant="full">
      <RankingsBoard
        view={view}
        board={board}
        period={period}
        settings={settings}
        volunteers={volunteers}
        donors={donors}
        volunteerTrend={volunteerTrend}
        donorTrend={donorTrend}
        loading={loading}
        onViewChange={setView}
        onBoardChange={setBoard}
        onPeriodChange={setPeriod}
      />
    </ContentShell>
  )
}
