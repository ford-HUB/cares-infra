/**
 * The health board for what the schedulers depend on. A sweep on the server probes
 * the database, Redis, the ML services, the queues and every scheduler, once a
 * minute and on demand; this is what one such sweep found.
 */
/** One probe's verdict in the diagnostics sweep. */
export type DiagnosticStatus = 'ok' | 'warn' | 'fail'

/** What a probe is checking — the card groups by this. */
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
  /** Round-trip of the probe; null where nothing was timed. */
  latencyMs: number | null
  /** What was found, in staff language. */
  detail: string
}

export interface DiagnosticReport {
  checkedAt: string
  durationMs: number
  overall: DiagnosticOverall
  /** Whether the sweep fired on its schedule or someone pressed "Check now". */
  source: 'scheduled' | 'manual'
  checks: DiagnosticCheck[]
}

/** One past sweep — the strip of verdicts under the card. */
export interface DiagnosticHistoryEntry {
  checkedAt: string
  overall: DiagnosticOverall
  failing: number
}

export interface SystemDiagnostics {
  /** Null until the first sweep has run after a fresh deploy. */
  report: DiagnosticReport | null
  /** Oldest first. */
  history: DiagnosticHistoryEntry[]
}
