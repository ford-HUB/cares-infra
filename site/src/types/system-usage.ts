import type { DiagnosticGroup, DiagnosticOverall } from './system-diagnostics'

export type SystemUsageRangeDays = 7 | 14 | 30

export interface DailyUsage {
  /** Local `YYYY-MM-DD`. */
  date: string
  /** 0–100 % of total capacity. */
  cpuAvg: number
  cpuPeak: number
  /** Placeholder days: the server keeps only the last 24 h. */
  sample: boolean
}

export type ServiceHealth = 'operational' | 'degraded' | 'down' | 'paused'

export type ServiceKind = DiagnosticGroup

export interface ServiceStatusRow {
  id: string
  name: string
  kind: ServiceKind
  health: ServiceHealth
  /** Null when not timed. */
  timing: { label: 'Probe' | 'Avg run'; ms: number } | null
  /** 0–100; schedulers only. */
  successRate: number | null
  lastActivityAt: string | null
  /** Null when operational. */
  note: string | null
}

export type SystemEventSeverity = 'info' | 'warning' | 'critical'

/** Newest first. */
export interface SystemEvent {
  id: string
  at: string
  severity: SystemEventSeverity
  title: string
  source: string
}

export interface SystemHealthSummary {
  overall: DiagnosticOverall | null
  checkedAt: string | null
  /** 0–100; null before any history. */
  healthyPercent: number | null
  sweeps: number
}

/** Each source loads and fails on its own. */
export interface LiveSourceState {
  allowed: boolean
  initialized: boolean
  error: string | null
}
