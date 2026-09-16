import type { PerformanceRangeId } from '../constants/system-performance'
import type {
  CpuCore,
  EndpointLatency,
  HttpMethod,
  PageLoadTiming,
  PerformanceSample,
  PerformanceSnapshot,
  PerformanceTick,
  ProcessLoad,
} from '../types/system-performance'
import { apiClient, parseApiError } from './api-client'

/**
 * Host and request metrics from the server's own sampler. The snapshot is the
 * whole page in one read; the tick is the newest reading alone, polled every few
 * seconds on the live range. Failures throw with the server's message so the store
 * can turn them into the banner.
 */

interface PerformanceSampleApiResponse {
  at: string
  cpu_user: number
  cpu_system: number
  cpu_io_wait: number
  memory_percent: number
  requests_per_minute: number
  response_p50_ms: number
  response_p95_ms: number
}

interface CpuCoreApiResponse {
  id: number
  usage_percent: number
}

interface ProcessLoadApiResponse {
  id: string
  name: string
  owner: ProcessLoad['owner']
  cpu_percent: number
  memory_mb: number
  threads: number | null
}

interface EndpointLatencyApiResponse {
  id: string
  method: string
  route: string
  calls_per_minute: number
  p50_ms: number
  p95_ms: number
  error_rate: number
  trend: number[]
}

interface PageLoadTimingApiResponse {
  id: string
  label: string
  ttfb_ms: number
  dom_ready_ms: number
  interactive_ms: number
  samples: number
}

interface PerformanceSnapshotApiResponse {
  captured_at: string
  host: {
    name: string
    region: string
    vcpu: number
    memory_gb: number
    uptime_hours: number
  }
  samples: PerformanceSampleApiResponse[]
  cores: CpuCoreApiResponse[]
  processes: ProcessLoadApiResponse[]
  endpoints: EndpointLatencyApiResponse[]
  pages: PageLoadTimingApiResponse[]
  load_average: [number, number, number]
}

interface PerformanceTickApiResponse {
  sample: PerformanceSampleApiResponse | null
  cores: CpuCoreApiResponse[]
  processes: ProcessLoadApiResponse[]
  load_average: [number, number, number]
}

function mapSample(data: PerformanceSampleApiResponse): PerformanceSample {
  return {
    at: data.at,
    cpuUser: data.cpu_user,
    cpuSystem: data.cpu_system,
    cpuIoWait: data.cpu_io_wait,
    memoryPercent: data.memory_percent,
    requestsPerMinute: data.requests_per_minute,
    responseP50Ms: data.response_p50_ms,
    responseP95Ms: data.response_p95_ms,
  }
}

function mapCore(data: CpuCoreApiResponse): CpuCore {
  return { id: data.id, usagePercent: data.usage_percent }
}

function mapProcess(data: ProcessLoadApiResponse): ProcessLoad {
  return {
    id: data.id,
    name: data.name,
    owner: data.owner,
    cpuPercent: data.cpu_percent,
    memoryMb: data.memory_mb,
    threads: data.threads,
  }
}

function mapEndpoint(data: EndpointLatencyApiResponse): EndpointLatency {
  return {
    id: data.id,
    method: data.method as HttpMethod,
    route: data.route,
    callsPerMinute: data.calls_per_minute,
    p50Ms: data.p50_ms,
    p95Ms: data.p95_ms,
    errorRate: data.error_rate,
    trend: data.trend,
  }
}

function mapPage(data: PageLoadTimingApiResponse): PageLoadTiming {
  return {
    id: data.id,
    label: data.label,
    ttfbMs: data.ttfb_ms,
    domReadyMs: data.dom_ready_ms,
    interactiveMs: data.interactive_ms,
    samples: data.samples,
  }
}

export async function fetchPerformanceSnapshot(
  rangeId: PerformanceRangeId,
): Promise<PerformanceSnapshot> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: PerformanceSnapshotApiResponse
    }>('/api/v1/system-performance', { params: { range: rangeId } })
    const data = body.data

    return {
      capturedAt: data.captured_at,
      host: {
        name: data.host.name,
        region: data.host.region,
        vcpu: data.host.vcpu,
        memoryGb: data.host.memory_gb,
        uptimeHours: data.host.uptime_hours,
      },
      samples: data.samples.map(mapSample),
      cores: data.cores.map(mapCore),
      processes: data.processes.map(mapProcess),
      endpoints: data.endpoints.map(mapEndpoint),
      pages: data.pages.map(mapPage),
      loadAverage: data.load_average,
    }
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

/** The live tick — the sampler's newest reading and the breakdown it drives. */
export async function fetchPerformanceTick(): Promise<PerformanceTick> {
  try {
    const { data: body } = await apiClient.get<{
      ok: true
      data: PerformanceTickApiResponse
    }>('/api/v1/system-performance/tick')
    const data = body.data

    return {
      sample: data.sample ? mapSample(data.sample) : null,
      cores: data.cores.map(mapCore),
      processes: data.processes.map(mapProcess),
      loadAverage: data.load_average,
    }
  } catch (error) {
    throw new Error(parseApiError(error), { cause: error })
  }
}

export interface PageTimingReport {
  route: string
  label: string
  ttfbMs: number
  domReadyMs: number
  interactiveMs: number
}

/**
 * Fire-and-forget: one screen's load, as measured in this tab. A failed report is
 * dropped silently — it is telemetry, and must never surface to the person browsing.
 */
export async function reportPageTiming(report: PageTimingReport): Promise<void> {
  try {
    await apiClient.post('/api/v1/system-performance/page-timings', {
      route: report.route,
      label: report.label,
      ttfb_ms: Math.round(report.ttfbMs),
      dom_ready_ms: Math.round(report.domReadyMs),
      interactive_ms: Math.round(report.interactiveMs),
    })
  } catch {
    // Telemetry only.
  }
}
