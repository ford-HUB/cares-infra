import { useEffect } from 'react'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { SystemDiagnosticsBanner } from '../../components/system-diagnostics/system-diagnostics-banner'
import { SystemDiagnosticsBoard } from '../../components/system-diagnostics/system-diagnostics-board'
import { SystemDiagnosticsSkeleton } from '../../components/system-diagnostics/ui/system-diagnostics-skeleton'
import { DIAGNOSTICS_POLL_INTERVAL_MS } from '../../constants/system-diagnostics'
import { useSystemDiagnosticsStore } from '../../store/system-diagnostics-store'

export function SystemDiagnosticsPage() {
  const diagnostics = useSystemDiagnosticsStore((s) => s.diagnostics)
  const initialized = useSystemDiagnosticsStore((s) => s.initialized)
  const error = useSystemDiagnosticsStore((s) => s.error)
  const running = useSystemDiagnosticsStore((s) => s.running)
  const fetchDiagnostics = useSystemDiagnosticsStore((s) => s.fetchDiagnostics)
  const runNow = useSystemDiagnosticsStore((s) => s.runNow)

  useEffect(() => {
    void fetchDiagnostics()
  }, [fetchDiagnostics])

  // Silent polls pick up each server sweep without blinking to the skeleton.
  useEffect(() => {
    const timer = window.setInterval(
      () => void fetchDiagnostics({ silent: true }),
      DIAGNOSTICS_POLL_INTERVAL_MS,
    )
    return () => window.clearInterval(timer)
  }, [fetchDiagnostics])

  const report = diagnostics?.report ?? null

  return (
    <ContentShell>
      <header className="mb-4">
        <h1 className="text-[15px] font-semibold text-gray-900">System diagnostics</h1>
        <p className="mt-0.5 text-[13px] text-gray-600">
          Everything the schedulers depend on, probed once a minute — the database,
          Redis, the ML services, the queues and every job&apos;s own clock. Run a check
          by hand when something looks off.
        </p>
      </header>

      {/* Otherwise the stale report reads as "all clear". */}
      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchDiagnostics()}
            className="font-medium underline underline-offset-2 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      ) : initialized ? (
        <>
          <SystemDiagnosticsBanner
            report={report}
            history={diagnostics?.history ?? []}
            running={running}
            onRunNow={() => void runNow()}
          />
          {report ? (
            <SystemDiagnosticsBoard checks={report.checks} />
          ) : (
            <p className="rounded-lg bg-gray-50 px-3 py-6 text-center text-[13px] text-gray-500">
              The first sweep has not run yet. Press &ldquo;Check now&rdquo; to run one.
            </p>
          )}
        </>
      ) : (
        <SystemDiagnosticsSkeleton />
      )}
    </ContentShell>
  )
}
