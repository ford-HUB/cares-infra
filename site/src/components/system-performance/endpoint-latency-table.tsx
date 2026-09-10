import { Card, CardContent } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { formatNumber } from '../../constants/formatting'
import {
  CPU_BAND_COLOR,
  ENDPOINT_SORT_LABELS,
  HTTP_METHOD_STYLES,
  RESPONSE_SERIES_COLOR,
  RESPONSE_STRAINED_MS,
  formatDuration,
  responseHealth,
  type EndpointSort,
} from '../../constants/system-performance'
import type { EndpointLatency } from '../../types/system-performance'
import { MetricSparkline } from './ui/metric-sparkline'

interface EndpointLatencyTableProps {
  endpoints: EndpointLatency[]
  sort: EndpointSort
  onSortChange: (sort: EndpointSort) => void
}

const SORTS: EndpointSort[] = ['slowest', 'busiest']

/**
 * Where the loading time is actually spent. The p95 column is drawn as a bar against
 * the slowest route on the page, so the two or three endpoints worth optimising stand
 * out without the reader comparing ten numbers by eye.
 */
export function EndpointLatencyTable({
  endpoints,
  sort,
  onSortChange,
}: EndpointLatencyTableProps) {
  const rows = [...endpoints].sort((a, b) =>
    sort === 'slowest' ? b.p95Ms - a.p95Ms : b.callsPerMinute - a.callsPerMinute,
  )
  const worst = Math.max(...endpoints.map((one) => one.p95Ms), 1)

  return (
    <Card className="mb-4 gap-0 py-0 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-gray-900">Loading time by endpoint</p>
          <p className="mt-0.5 text-[13px] text-gray-600">
            Server-side p50 and p95 per route, over the charted window. Bars compare
            each route's slow tail against the slowest one here.
          </p>
        </div>
        <ToggleGroup
          type="single"
          value={sort}
          onValueChange={(value) => value && onSortChange(value as EndpointSort)}
          variant="outline"
          size="sm"
          aria-label="Order routes by"
        >
          {SORTS.map((one) => (
            <ToggleGroupItem key={one} value={one}>
              {ENDPOINT_SORT_LABELS[one]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <CardContent className="overflow-x-auto px-0 py-0">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] tracking-wider text-gray-500 uppercase">
              <th className="px-4 py-2 font-medium">Route</th>
              <th className="px-4 py-2 text-right font-medium">Calls / min</th>
              <th className="px-4 py-2 text-right font-medium">Median</th>
              <th className="w-[26%] px-4 py-2 font-medium">Slow tail (p95)</th>
              <th className="px-4 py-2 text-right font-medium">Errors</th>
              <th className="w-[14%] px-4 py-2 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((endpoint) => {
              const health = responseHealth(endpoint.p95Ms)
              return (
                <tr key={endpoint.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide',
                          HTTP_METHOD_STYLES[endpoint.method],
                        )}
                      >
                        {endpoint.method}
                      </span>
                      <span className="min-w-0 truncate font-mono text-[12px] text-gray-700">
                        {endpoint.route}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-[13px] text-gray-700 tabular-nums">
                    {formatNumber(endpoint.callsPerMinute)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[13px] text-gray-700 tabular-nums">
                    {formatDuration(endpoint.p50Ms)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(endpoint.p95Ms / worst) * 100}%`,
                            backgroundColor:
                              health === 'healthy'
                                ? CPU_BAND_COLOR.user
                                : RESPONSE_SERIES_COLOR.p95,
                          }}
                        />
                      </div>
                      <span
                        className={cn(
                          'w-16 shrink-0 text-right text-[13px] font-medium tabular-nums',
                          health === 'healthy' ? 'text-gray-700' : 'text-red-700',
                        )}
                      >
                        {formatDuration(endpoint.p95Ms)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-[13px] tabular-nums">
                    {endpoint.errorRate > 0 ? (
                      <span className="text-amber-700">
                        {(endpoint.errorRate * 100).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <MetricSparkline
                      values={endpoint.trend}
                      color={health === 'healthy' ? '#9ca3af' : RESPONSE_SERIES_COLOR.p95}
                      label={`${endpoint.route} p95 trend`}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardContent>

      <p className="border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400">
        Anything past {RESPONSE_STRAINED_MS} ms is drawn in the slow-tail colour — the
        same one the chart above uses for p95.
      </p>
    </Card>
  )
}
