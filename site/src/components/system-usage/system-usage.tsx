import { formatCompact, formatMs, formatPercent } from '../../constants/system-usage'
import type { useSystemUsage } from '../../hooks/use-system-usage'
import { ServiceUsageTable } from './service-usage-table'
import { SystemUsageSummary } from './system-usage-summary'
import { DailyCpuChart } from './ui/daily-cpu-chart'
import { LiveMetricChart } from './ui/live-metric-chart'
import { SystemEventsList } from './ui/system-events-list'

type SystemUsageProps = Omit<ReturnType<typeof useSystemUsage>, 'pending' | 'refresh'>

/** The admin's report body: live summary, CPU per day, 24 h loads, services, events. */
export function SystemUsage(props: SystemUsageProps) {
  const { samples, liveSample, host, performanceSource } = props
  const series = (pick: (s: (typeof samples)[number]) => number) =>
    samples.map((s) => ({ at: s.at, value: pick(s) }))

  return (
    <div className={`transition-opacity ${props.refreshing ? 'opacity-60' : ''}`} aria-busy={props.refreshing}>
      <SystemUsageSummary
        liveSample={liveSample}
        today={props.today}
        host={host}
        health={props.health}
        counts={props.counts}
        totalServices={props.totalRows}
        performanceSource={performanceSource}
        servicesSource={props.servicesSource}
        healthFilter={props.healthFilter}
        onHealthFilter={props.toggleHealthFilter}
      />

      <div className="mb-4">
        <DailyCpuChart daily={props.daily} range={props.range} onRangeChange={props.changeRange} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <LiveMetricChart
          title="Memory used"
          hint={host ? `Last 24 h, of ${host.memoryGb} GB.` : 'Last 24 h.'}
          points={series((s) => s.memoryPercent)}
          now={liveSample?.memoryPercent ?? null}
          format={(v) => formatPercent(v)}
          domain={[0, 100]}
          source={performanceSource}
        />
        <LiveMetricChart
          title="API requests"
          hint="Requests per minute, last 24 h."
          points={series((s) => s.requestsPerMinute)}
          now={liveSample?.requestsPerMinute ?? null}
          format={(v) => formatCompact(Math.round(v))}
          unit="/min"
          source={performanceSource}
        />
        <LiveMetricChart
          title="Response time (p95)"
          hint="The slow tail staff notice as lag."
          points={series((s) => s.responseP95Ms)}
          now={liveSample?.responseP95Ms ?? null}
          format={formatMs}
          source={performanceSource}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <ServiceUsageTable
            rows={props.rows}
            total={props.totalRows}
            healthFilter={props.healthFilter}
            onClearFilter={props.clearHealthFilter}
            source={props.servicesSource}
          />
        </div>
        <SystemEventsList events={props.events} />
      </div>
    </div>
  )
}
