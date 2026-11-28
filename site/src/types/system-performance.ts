export interface PerformanceSample {
  at: string
  /** Percentage points of total CPU; the three sum to CPU busy. */
  cpuUser: number
  cpuSystem: number
  cpuIoWait: number
  memoryPercent: number
  requestsPerMinute: number
  responseP50Ms: number
  responseP95Ms: number
}

export type CpuBand = 'user' | 'system' | 'ioWait'

export type HealthState = 'healthy' | 'strained' | 'critical'

export interface CpuCore {
  id: number
  usagePercent: number
}

export type ProcessOwner = 'server' | 'microservices' | 'database' | 'site' | 'other'

export interface ProcessLoad {
  id: string
  name: string
  owner: ProcessOwner
  /** Share of total host capacity. */
  cpuPercent: number
  memoryMb: number
  /** Null where the host doesn't report it. */
  threads: number | null
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface EndpointLatency {
  id: string
  method: HttpMethod
  route: string
  callsPerMinute: number
  p50Ms: number
  p95Ms: number
  /** 0–1 share of 5xx responses. */
  errorRate: number
  /** Recent p95s, oldest first. */
  trend: number[]
}

export interface PageLoadTiming {
  id: string
  label: string
  ttfbMs: number
  domReadyMs: number
  interactiveMs: number
  samples: number
}

export interface PerformanceHost {
  name: string
  region: string
  vcpu: number
  memoryGb: number
  uptimeHours: number
}

export interface PerformanceTick {
  sample: PerformanceSample | null
  cores: CpuCore[]
  processes: ProcessLoad[]
  loadAverage: [number, number, number]
}

export interface PerformanceSnapshot {
  capturedAt: string
  host: PerformanceHost
  /** Oldest first; the last entry is "now". */
  samples: PerformanceSample[]
  cores: CpuCore[]
  processes: ProcessLoad[]
  endpoints: EndpointLatency[]
  pages: PageLoadTiming[]
  /** 1 / 5 / 15-minute. */
  loadAverage: [number, number, number]
}

export interface CpuFinding {
  id: string
  state: HealthState
  title: string
  detail: string
}
