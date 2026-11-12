import { useCallback, useEffect, useMemo, useState } from 'react'
import { PORTAL_PERMISSION } from '../constants/portal-permissions'
import { LIVE_REFRESH_MS, LIVE_TICK_MS } from '../constants/system-usage'
import { usePermission } from '../store/auth-store'
import { useSystemUsageStore } from '../store/system-usage-store'
import type { LiveSourceState, ServiceHealth, SystemUsageRangeDays } from '../types/system-usage'
import {
  deriveEvents,
  healthCounts,
  lastDayUsage,
  serviceRows,
  systemHealth,
} from '../utils/system-usage-live'

const visible = () => document.visibilityState === 'visible'

/**
 * The admin's Statistics screen, live. Readings come from the endpoints the System
 * Performance, Services and Diagnostics screens already use — read-only, nothing
 * new on the server: a 3 s tick for CPU and memory now, and every 15 s the 24 h
 * snapshot, the service roster and the diagnostics sweep. Polling pauses while the
 * tab is hidden and catches up when it is shown. Each source is only requested when
 * the account holds its right, and is reported on its own when it can't be read.
 */
export function useSystemUsage() {
  const canReadPerformance = usePermission(PORTAL_PERMISSION.SYSTEM_PERFORMANCE_VIEW)
  const canReadServices = usePermission(PORTAL_PERMISSION.SYSTEM_SERVICE_MANAGE)

  const range = useSystemUsageStore((st) => st.range)
  const history = useSystemUsageStore((st) => st.history)
  const historyInitialized = useSystemUsageStore((st) => st.historyInitialized)
  const snapshot = useSystemUsageStore((st) => st.snapshot)
  const snapshotStatus = useSystemUsageStore((st) => st.snapshotStatus)
  const liveSample = useSystemUsageStore((st) => st.liveSample)
  const livePeak = useSystemUsageStore((st) => st.livePeak)
  const services = useSystemUsageStore((st) => st.services)
  const servicesStatus = useSystemUsageStore((st) => st.servicesStatus)
  const diagnostics = useSystemUsageStore((st) => st.diagnostics)
  const diagnosticsStatus = useSystemUsageStore((st) => st.diagnosticsStatus)
  const fetchHistory = useSystemUsageStore((st) => st.fetchHistory)
  const fetchSnapshot = useSystemUsageStore((st) => st.fetchSnapshot)
  const tick = useSystemUsageStore((st) => st.tick)
  const fetchServices = useSystemUsageStore((st) => st.fetchServices)
  const fetchDiagnostics = useSystemUsageStore((st) => st.fetchDiagnostics)

  const [healthFilter, setHealthFilter] = useState<ServiceHealth | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const refreshLive = useCallback(async () => {
    const jobs: Promise<void>[] = []
    if (canReadPerformance) jobs.push(fetchSnapshot(), tick())
    if (canReadServices) jobs.push(fetchServices(), fetchDiagnostics())
    await Promise.all(jobs)
  }, [canReadPerformance, canReadServices, fetchSnapshot, tick, fetchServices, fetchDiagnostics])

  useEffect(() => {
    void fetchHistory()
  }, [fetchHistory])

  useEffect(() => {
    void refreshLive()
    const slow = window.setInterval(() => visible() && void refreshLive(), LIVE_REFRESH_MS)
    const fast = canReadPerformance
      ? window.setInterval(() => visible() && void tick(), LIVE_TICK_MS)
      : undefined
    // Back from another tab: catch up at once instead of waiting for the next beat.
    const onShow = () => visible() && void refreshLive()
    document.addEventListener('visibilitychange', onShow)
    return () => {
      window.clearInterval(slow)
      if (fast) window.clearInterval(fast)
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [refreshLive, tick, canReadPerformance])

  const today = useMemo(
    () => lastDayUsage(snapshot, liveSample, livePeak),
    [snapshot, liveSample, livePeak],
  )
  const daily = useMemo(() => (today ? [...history, today] : history), [history, today])
  const rows = useMemo(() => serviceRows(diagnostics, services), [diagnostics, services])
  const counts = useMemo(() => healthCounts(rows), [rows])
  const health = useMemo(() => systemHealth(diagnostics), [diagnostics])
  const events = useMemo(
    () => deriveEvents(snapshot, diagnostics, services),
    [snapshot, diagnostics, services],
  )
  const visibleRows = useMemo(
    () => rows.filter((r) => healthFilter === null || r.health === healthFilter),
    [rows, healthFilter],
  )

  const performanceSource: LiveSourceState = { allowed: canReadPerformance, ...snapshotStatus }
  // The table needs the roster and the sweep; it is ready once both have settled.
  const servicesSource: LiveSourceState = {
    allowed: canReadServices,
    initialized: servicesStatus.initialized && diagnosticsStatus.initialized,
    error: servicesStatus.error ?? diagnosticsStatus.error,
  }

  return {
    pending:
      !historyInitialized ||
      (performanceSource.allowed && !performanceSource.initialized) ||
      (servicesSource.allowed && !servicesSource.initialized),
    range,
    changeRange: (next: SystemUsageRangeDays) => void fetchHistory(next),
    daily,
    host: snapshot?.host ?? null,
    samples: snapshot?.samples ?? [],
    liveSample,
    today,
    performanceSource,
    servicesSource,
    rows: visibleRows,
    totalRows: rows.length,
    counts,
    health,
    events,
    healthFilter,
    toggleHealthFilter: (h: ServiceHealth) => setHealthFilter((c) => (c === h ? null : h)),
    clearHealthFilter: () => setHealthFilter(null),
    refreshing,
    refresh: async () => {
      setRefreshing(true)
      await refreshLive()
      setRefreshing(false)
    },
  }
}
