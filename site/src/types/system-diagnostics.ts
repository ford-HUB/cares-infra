/** Swept server-side once a minute and on demand. */
export type DiagnosticStatus = 'ok' | 'warn' | 'fail'

export type DiagnosticGroup =
  | 'database'
  | 'cache'
  | 'microservice'
  | 'queue'
  | 'scheduler'
  | 'process'

export type DiagnosticOverall = 'healthy' | 'degraded' | 'down'

export interface DiagnosticCheck {
  id: string
  group: DiagnosticGroup
  name: string
  status: DiagnosticStatus
  /** Null where nothing was timed. */
  latencyMs: number | null
  detail: string
}

export interface DiagnosticReport {
  checkedAt: string
  durationMs: number
  overall: DiagnosticOverall
  source: 'scheduled' | 'manual'
  checks: DiagnosticCheck[]
}

export interface DiagnosticHistoryEntry {
  checkedAt: string
  overall: DiagnosticOverall
  failing: number
}

export interface SystemDiagnostics {
  /** Null until the first sweep after a fresh deploy. */
  report: DiagnosticReport | null
  /** Oldest first. */
  history: DiagnosticHistoryEntry[]
}
