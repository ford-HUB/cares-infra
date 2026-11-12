import type { DiagnosticGroup, DiagnosticOverall } from './system-diagnostics'

/**
 * The admin's Statistics screen: how the machines and services behind CARES are
 * holding up — live readings from the existing system endpoints (performance tick
 * and 24 h snapshot, the service roster, the diagnostics sweep), plus CPU per day.
 */

export type SystemUsageRangeDays = 7 | 14 | 30

/** One day's CPU on the host. */
export interface DailyUsage {
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string
  /** Mean CPU busy that day, 0–100 % of total capacity. */
  cpuAvg: number
  /** Highest single CPU-busy reading that day. */
  cpuPeak: number
  /**
   * True for days the server has no record of yet — the server keeps only the last
   * 24 h, so every day before that is placeholder data, drawn faded and labelled.
   */
  sample: boolean
}

/** A service's standing right now — the summary bar and the table share it. */
export type ServiceHealth = 'operational' | 'degraded' | 'down' | 'paused'

/** Diagnostics probe groups, plus the scheduler roster. */
export type ServiceKind = DiagnosticGroup

/** One row of the services table, from a diagnostics probe or a scheduler. */
export interface ServiceStatusRow {
  id: string
  name: string
  kind: ServiceKind
  health: ServiceHealth
  /** Probe round-trip, or a scheduler's median run time; null when not timed. */
  timing: { label: 'Probe' | 'Avg run'; ms: number } | null
  /** Share of recent runs that succeeded, 0–100 — schedulers only. */
  successRate: number | null
  lastActivityAt: string | null
  /** Why it isn't operational; null when it is. */
  note: string | null
}

export type SystemEventSeverity = 'info' | 'warning' | 'critical'

/** Something worth knowing happened — derived from the live sources, newest first. */
export interface SystemEvent {
  id: string
  at: string
  severity: SystemEventSeverity
  title: string
  source: string
}

/** The diagnostics verdict and how often recent sweeps found everything healthy. */
export interface SystemHealthSummary {
  overall: DiagnosticOverall | null
  checkedAt: string | null
  /** Share of recent sweeps that were healthy, 0–100; null before any history. */
  healthyPercent: number | null
  sweeps: number
}

/** One live source's state — each loads and fails on its own. */
export interface LiveSourceState {
  /** The account may read this source at all. */
  allowed: boolean
  initialized: boolean
  error: string | null
}
