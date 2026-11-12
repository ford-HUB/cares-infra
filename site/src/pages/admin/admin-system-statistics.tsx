import { ContentShell } from '../../components/portal/ui/content-shell'
import { SystemUsage } from '../../components/system-usage/system-usage'
import { SystemUsageToolbar } from '../../components/system-usage/system-usage-toolbar'
import { SystemUsageSkeleton } from '../../components/system-usage/ui/system-usage-skeleton'
import { useSystemUsage } from '../../hooks/use-system-usage'

/**
 * The admin's Statistics screen. The admin runs the system, not the programme, so
 * their statistics are the machine's — live CPU and memory, CPU per day, the 24 h
 * loads and every service's health.
 */
export function AdminSystemStatisticsPage() {
  const { pending, refresh, ...usage } = useSystemUsage()

  return (
    <ContentShell>
      <SystemUsageToolbar
        hostName={usage.host?.name}
        performanceSource={usage.performanceSource}
        refreshing={usage.refreshing}
        onRefresh={() => void refresh()}
      />
      {pending ? <SystemUsageSkeleton /> : <SystemUsage {...usage} />}
    </ContentShell>
  )
}
