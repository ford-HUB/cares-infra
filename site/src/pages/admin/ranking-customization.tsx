import { ContentShell } from '../../components/portal/ui/content-shell'
import { RankingCustomizationForm } from '../../components/rankings/ranking-customization-form'
import { useRankingCustomizationForm } from '../../hooks/use-ranking-customization-form'

export function RankingCustomizationPage() {
  const customization = useRankingCustomizationForm()

  return (
    <ContentShell>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Ranking Customization</h1>
        <p className="text-[13px] text-gray-500">
          Set how points are earned and how the tier badges are cut.
        </p>
      </div>

      <RankingCustomizationForm {...customization} />
    </ContentShell>
  )
}
