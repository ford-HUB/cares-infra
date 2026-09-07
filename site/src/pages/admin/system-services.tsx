import { useEffect, useMemo, useState } from 'react'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { SystemServicesBanner } from '../../components/system-services/system-services-banner'
import { SystemServicesList } from '../../components/system-services/system-services-list'
import { ServiceLogsDialog } from '../../components/system-services/ui/service-logs-dialog'
import { ServiceScheduleDialog } from '../../components/system-services/ui/service-schedule-dialog'
import { SystemServicesSkeleton } from '../../components/system-services/ui/system-services-skeleton'
import {
  SERVICE_POLL_INTERVAL_MS,
  SERVICE_STATE_FILTER_ALL,
  type ServiceStateFilter,
} from '../../constants/system-services'
import { useSystemServiceStore } from '../../store/system-service-store'
import type { SystemServiceCounts } from '../../types/system-service'

/** Rows the skeleton draws — the roster is a fixed set of workers, not a paged list. */
const SKELETON_ROWS = 6

export function SystemServicesPage() {
  const services = useSystemServiceStore((s) => s.services)
  const initialized = useSystemServiceStore((s) => s.initialized)
  const error = useSystemServiceStore((s) => s.error)
  const busyId = useSystemServiceStore((s) => s.busyId)
  const logs = useSystemServiceStore((s) => s.logs)
  const logsLoading = useSystemServiceStore((s) => s.logsLoading)
  const fetchLogs = useSystemServiceStore((s) => s.fetchLogs)
  const fetchServices = useSystemServiceStore((s) => s.fetchServices)
  const togglePaused = useSystemServiceStore((s) => s.togglePaused)
  const runNow = useSystemServiceStore((s) => s.runNow)
  const stopRun = useSystemServiceStore((s) => s.stopRun)
  const saveSchedule = useSystemServiceStore((s) => s.saveSchedule)

  const [stateFilter, setStateFilter] = useState<ServiceStateFilter>(
    SERVICE_STATE_FILTER_ALL,
  )
  const [configuringId, setConfiguringId] = useState<string | null>(null)
  const [logsId, setLogsId] = useState<string | null>(null)

  useEffect(() => {
    void fetchServices()
  }, [fetchServices])

  // Silent polls keep the rows on screen — a board watched for an hour must not blink
  // back to its skeleton every fifteen seconds.
  useEffect(() => {
    const timer = window.setInterval(
      () => void fetchServices({ silent: true }),
      SERVICE_POLL_INTERVAL_MS,
    )
    return () => window.clearInterval(timer)
  }, [fetchServices])

  // Counted over the whole roster, not the filtered view — the banner is the overview
  // the filter acts on, so its numbers must not move when a segment is selected.
  const counts = useMemo<SystemServiceCounts>(
    () => ({
      total: services.length,
      running: services.filter((one) => one.state === 'running').length,
      scheduled: services.filter((one) => one.state === 'scheduled').length,
      paused: services.filter((one) => one.state === 'paused').length,
      failing: services.filter((one) => one.state === 'failing').length,
    }),
    [services],
  )

  const visible = useMemo(
    () =>
      stateFilter === SERVICE_STATE_FILTER_ALL
        ? services
        : services.filter((service) => service.state === stateFilter),
    [services, stateFilter],
  )

  const configuring = services.find((service) => service.id === configuringId) ?? null
  const viewingLogs = services.find((service) => service.id === logsId) ?? null

  return (
    <ContentShell>
      <header className="mb-4">
        <h1 className="text-[15px] font-semibold text-gray-900">System services</h1>
        <p className="mt-0.5 text-[13px] text-gray-600">
          The schedulers that run around the clock behind CARES. Each one fires on its
          own trigger and is stopped at its runtime cap — both are set from here.
        </p>
      </header>

      {/*
        A failed read would otherwise leave the board showing the last roster, which
        reads as "everything is on duty" exactly when it may not be.
      */}
      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchServices()}
            className="font-medium underline underline-offset-2 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      ) : initialized ? (
        <>
          <SystemServicesBanner
            counts={counts}
            state={stateFilter}
            onStateChange={setStateFilter}
          />
          <SystemServicesList
            services={visible}
            busyId={busyId}
            onTogglePaused={togglePaused}
            onRunNow={runNow}
            onStopRun={stopRun}
            onConfigure={(service) => setConfiguringId(service.id)}
            onViewLogs={(service) => {
              setLogsId(service.id)
              void fetchLogs(service.id)
            }}
          />
        </>
      ) : (
        <SystemServicesSkeleton rows={SKELETON_ROWS} />
      )}

      <ServiceLogsDialog
        key={logsId ?? 'logs-closed'}
        service={viewingLogs}
        entries={logs}
        loading={logsLoading}
        onRefresh={() => logsId && void fetchLogs(logsId)}
        onClose={() => setLogsId(null)}
      />

      <ServiceScheduleDialog
        key={configuringId ?? 'closed'}
        service={configuring}
        saving={busyId === configuringId}
        onClose={() => setConfiguringId(null)}
        onSubmit={(update) => {
          if (!configuring) return
          void saveSchedule(configuring, update).then(() => setConfiguringId(null))
        }}
      />
    </ContentShell>
  )
}
