/**
 * What the portal knows about how hard the machines behind CARES are working right
 * now — CPU, memory, and the time a request actually takes end to end. The page this
 * feeds is watched during an event, so every shape here is a *stream* plus the
 * breakdown that explains it: a number without its history cannot say "getting worse".
 */

/** One reading of the whole host, taken on the sampler's tick. */
export interface PerformanceSample {
  at: string
  /** Percentage points of total CPU capacity, split so the three sum to CPU busy. */
  cpuUser: number
  cpuSystem: number
  cpuIoWait: number
  memoryPercent: number
  requestsPerMinute: number
  /** Server-side request time; the median is what most staff feel. */
  responseP50Ms: number
  /** The slow tail — the one that produces "the portal is lagging" reports. */
  responseP95Ms: number
}

/** The three parts of CPU busy time, as charted and as the banner's bar segments. */
export type CpuBand = 'user' | 'system' | 'ioWait'

/** How the host is coping, derived from CPU and the response tail together. */
export type HealthState = 'healthy' | 'strained' | 'critical'

/** One logical core, so a saturated core is visible under a calm average. */
export interface CpuCore {
  id: number
  usagePercent: number
  /** Which workload the scheduler is mostly running there, for the analysis card. */
  runningWhat: string
}

/** Which deployable a process belongs to — where staff go when it is the culprit. */
export type ProcessOwner = 'server' | 'microservices' | 'database' | 'site'

export interface ProcessLoad {
  id: string
  name: string
  owner: ProcessOwner
  /** Share of *total* host capacity, so the column sums toward CPU busy. */
  cpuPercent: number
  memoryMb: number
  threads: number
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

/** Server-side timing for one route — the loading time staff actually wait on. */
export interface EndpointLatency {
  id: string
  method: HttpMethod
  route: string
  callsPerMinute: number
  p50Ms: number
  p95Ms: number
  /** 0–1 share of calls that answered 5xx. */
  errorRate: number
  /** Recent p95 readings, oldest first — the row's sparkline. */
  trend: number[]
}

/** Browser-side load of one portal screen, split into the phases staff can feel. */
export interface PageLoadTiming {
  id: string
  label: string
  /** Wait before the first byte — server and network. */
  ttfbMs: number
  /** Markup parsed and styles applied. */
  domReadyMs: number
  /** Hydrated and answering clicks; the number that means "loaded". */
  interactiveMs: number
  /** Page views the three medians were taken over. */
  samples: number
}

export interface PerformanceHost {
  name: string
  region: string
  vcpu: number
  memoryGb: number
  uptimeHours: number
}

/** Everything the performance page draws, read as one snapshot. */
export interface PerformanceSnapshot {
  capturedAt: string
  host: PerformanceHost
  /** Oldest first; the last entry is "now". */
  samples: PerformanceSample[]
  cores: CpuCore[]
  processes: ProcessLoad[]
  endpoints: EndpointLatency[]
  pages: PageLoadTiming[]
  /** 1 / 5 / 15-minute load average, as reported by the host. */
  loadAverage: [number, number, number]
}

/** One plain-language conclusion the page draws from the numbers on it. */
export interface CpuFinding {
  id: string
  state: HealthState
  /** The conclusion itself, readable without looking at the chart. */
  title: string
  /** What to do or look at next. */
  detail: string
}
