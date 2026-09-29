import { useEffect, useState } from 'react'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { CpuAnalysisCard } from '../../components/system-performance/cpu-analysis-card'
import { EndpointLatencyTable } from '../../components/system-performance/endpoint-latency-table'
import { PageLoadPanel } from '../../components/system-performance/page-load-panel'
import { PerformanceBanner } from '../../components/system-performance/performance-banner'
import { PerformanceStatRow } from '../../components/system-performance/performance-stat-row'
import { PerformanceToolbar } from '../../components/system-performance/performance-toolbar'
import { CpuLoadChart } from '../../components/system-performance/ui/cpu-load-chart'
import { ResponseTimeChart } from '../../components/system-performance/ui/response-time-chart'
import { SystemPerformanceSkeleton } from '../../components/system-performance/ui/system-performance-skeleton'
import {
  PERFORMANCE_TICK_MS,
  findPerformanceRange,
  type EndpointSort,
} from '../../constants/system-performance'
import { useSystemPerformanceStore } from '../../store/system-performance-store'
import type { CpuBand } from '../../types/system-performance'

export function SystemPerformancePage() {
  const snapshot = useSystemPerformanceStore((s) => s.snapshot)
  const initialized = useSystemPerformanceStore((s) => s.initialized)
  const error = useSystemPerformanceStore((s) => s.error)
  const range = useSystemPerformanceStore((s) => s.range)
  const streaming = useSystemPerformanceStore((s) => s.streaming)
  const fetchSnapshot = useSystemPerformanceStore((s) => s.fetchSnapshot)
  const setRange = useSystemPerformanceStore((s) => s.setRange)
  const setStreaming = useSystemPerformanceStore((s) => s.setStreaming)
  const tick = useSystemPerformanceStore((s) => s.tick)

  /** Which CPU band the banner has focused; null charts all three. */
  const [focus, setFocus] = useState<CpuBand | null>(null)
  const [endpointSort, setEndpointSort] = useState<EndpointSort>('slowest')

  useEffect(() => {
    void fetchSnapshot()
  }, [fetchSnapshot])

  // The live window appends a reading on every tick; the aggregate windows sit still,
  // so the timer is not armed for them at all.
  useEffect(() => {
    if (!streaming || !findPerformanceRange(range).streaming) return

    const timer = window.setInterval(() => void tick(), PERFORMANCE_TICK_MS)
    return () => window.clearInterval(timer)
  }, [streaming, range, tick])

  const latest = snapshot?.samples[snapshot.samples.length - 1] ?? null

  return (
    <ContentShell>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-gray-900">System performance</h1>
          <p className="mt-0.5 text-[13px] text-gray-600">
            What the host running CARES is doing right now — CPU, memory, and the time a
            request actually takes, with the reading of those numbers underneath.
          </p>
        </div>

        {snapshot && (
          <PerformanceToolbar
            range={range}
            onRangeChange={(next) => void setRange(next)}
            streaming={streaming}
            onStreamingChange={setStreaming}
            capturedAt={snapshot.capturedAt}
            onRefresh={() => void fetchSnapshot()}
          />
        )}
      </header>

      {/*
        A failed read would otherwise leave the last sample on screen, which reads as
        "the host is fine" exactly when nothing is being measured.
      */}
      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchSnapshot()}
            className="font-medium underline underline-offset-2 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      ) : initialized && snapshot && latest ? (
        <>
          <PerformanceBanner
            sample={latest}
            host={snapshot.host}
            loadAverage={snapshot.loadAverage}
            focus={focus}
            onFocusChange={setFocus}
            streaming={streaming && findPerformanceRange(range).streaming}
          />

          <PerformanceStatRow samples={snapshot.samples} host={snapshot.host} />

          <div className="mb-4">
            <CpuLoadChart samples={snapshot.samples} range={range} focus={focus} />
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ResponseTimeChart samples={snapshot.samples} range={range} />
            <PageLoadPanel pages={snapshot.pages} />
          </div>

          <CpuAnalysisCard
            sample={latest}
            cores={snapshot.cores}
            processes={snapshot.processes}
          />

          <EndpointLatencyTable
            endpoints={snapshot.endpoints}
            sort={endpointSort}
            onSortChange={setEndpointSort}
          />
        </>
      ) : (
        <SystemPerformanceSkeleton />
      )}
    </ContentShell>
  )
}
