import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ContentShell } from '../../components/portal/ui/content-shell'
import { DeployedCertificateDetail } from '../../components/deployed-certificates/deployed-certificate-detail'
import { DeployedCertificateGallery } from '../../components/deployed-certificates/deployed-certificate-gallery'
import { DeployedCertificateTable } from '../../components/deployed-certificates/deployed-certificate-table'
import { DeployedCertificatesSummary } from '../../components/deployed-certificates/deployed-certificates-summary'
import {
  DeployedCertificatesToolbar,
  EVENT_FILTER_ALL,
} from '../../components/deployed-certificates/deployed-certificates-toolbar'
import { DeployedCertificatesEmpty } from '../../components/deployed-certificates/ui/deployed-certificates-empty'
import {
  DEPLOYMENT_STATUS_FILTER_ALL,
  type DeploymentSort,
  type DeploymentStatusFilter,
  type DeploymentViewMode,
} from '../../constants/deployed-certificates'
import { ADMIN_CERTIFICATE_TEMPLATES_PATH } from '../../constants/routes'
import {
  countDeployedCertificates,
  distributionShare,
} from '../../services/shared/deployed-certificate-service'
import { useDeployedCertificateStore } from '../../store/deployed-certificate-store'
import type { DeployedCertificate } from '../../types/deployed-certificate'

export function DeployedCertificatesPage() {
  const navigate = useNavigate()
  const deployments = useDeployedCertificateStore((s) => s.deployments)
  const loading = useDeployedCertificateStore((s) => s.loading)
  const initialized = useDeployedCertificateStore((s) => s.initialized)
  const error = useDeployedCertificateStore((s) => s.error)
  const fetchDeployments = useDeployedCertificateStore((s) => s.fetchDeployments)
  const setDeploymentStatus = useDeployedCertificateStore((s) => s.setStatus)

  const [search, setSearch] = useState('')
  const [event, setEvent] = useState<string>(EVENT_FILTER_ALL)
  const [status, setStatus] = useState<DeploymentStatusFilter>(
    DEPLOYMENT_STATUS_FILTER_ALL,
  )
  const [sort, setSort] = useState<DeploymentSort>('recent')
  const [view, setView] = useState<DeploymentViewMode>('grid')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    void fetchDeployments()
  }, [fetchDeployments])

  const eventOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const one of deployments) seen.set(one.event.id, one.event.name)

    return [
      { value: EVENT_FILTER_ALL, label: 'All events' },
      ...[...seen].map(([value, label]) => ({ value, label })),
    ]
  }, [deployments])

  // Search and event narrow the whole the summary describes; status is that whole's
  // own split, so the segments stay measured against every deployment still in scope.
  const inScope = useMemo(() => {
    const term = search.trim().toLowerCase()

    return deployments.filter((one) => {
      if (event !== EVENT_FILTER_ALL && one.event.id !== event) return false
      if (!term) return true

      return (
        one.event.name.toLowerCase().includes(term) ||
        one.templateName.toLowerCase().includes(term) ||
        one.reference.toLowerCase().includes(term)
      )
    })
  }, [deployments, search, event])

  const counts = useMemo(() => countDeployedCertificates(inScope), [inScope])

  const visible = useMemo(() => {
    const rows =
      status === DEPLOYMENT_STATUS_FILTER_ALL
        ? [...inScope]
        : inScope.filter((one) => one.status === status)

    return rows.sort((a, b) => {
      if (sort === 'distribution') return distributionShare(a) - distributionShare(b)
      if (sort === 'participants') return b.participants - a.participants
      return b.deployedAt.localeCompare(a.deployedAt)
    })
  }, [inScope, status, sort])

  const selected = useMemo(
    () => visible.find((one) => one.id === selectedId) ?? null,
    [visible, selectedId],
  )

  const showSkeleton = !initialized || (loading && deployments.length === 0)
  const filtered =
    search.trim().length > 0 ||
    event !== EVENT_FILTER_ALL ||
    status !== DEPLOYMENT_STATUS_FILTER_ALL

  const clearFilters = () => {
    setSearch('')
    setEvent(EVENT_FILTER_ALL)
    setStatus(DEPLOYMENT_STATUS_FILTER_ALL)
  }

  // Selecting a deployment opens the modal; the grid keeps the full width behind it.
  const select = (deployment: DeployedCertificate) => setSelectedId(deployment.id)

  /**
   * Pausing holds a deployment where it is; resuming puts it back to distributing.
   * `scheduled` is never set by hand — a deployment leaves it when its event finishes.
   */
  const applyStatus = async (
    deployment: DeployedCertificate,
    status: 'distributing' | 'paused',
  ) => {
    try {
      await setDeploymentStatus(deployment.id, status)
      toast.success(
        status === 'paused'
          ? `${deployment.event.name} paused`
          : `${deployment.event.name} resumed`,
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'The deployment could not be updated',
      )
    }
  }

  const handleAction = (action: string, deployment: DeployedCertificate) => {
    if (action === 'preview') {
      setSelectedId(deployment.id)
      return
    }
    if (action === 'pause' || action === 'resume') {
      void applyStatus(deployment, action === 'pause' ? 'paused' : 'distributing')
      return
    }
    // Export, download and reminders wait on their own endpoints.
    toast(`${action} · ${deployment.event.name} — not wired yet`)
  }

  return (
    <ContentShell variant="full">
      <DeployedCertificatesToolbar
        search={search}
        event={event}
        eventOptions={eventOptions}
        sort={sort}
        view={view}
        shown={visible.length}
        total={deployments.length}
        initialized={initialized}
        onSearchChange={setSearch}
        onEventChange={setEvent}
        onSortChange={setSort}
        onViewChange={setView}
        onExport={() => toast('Export — not wired yet')}
      />

      <DeployedCertificatesSummary
        counts={counts}
        status={status}
        onStatusChange={setStatus}
      />

      <div className="min-w-0">
        {!showSkeleton && visible.length === 0 ? (
          <DeployedCertificatesEmpty
            filtered={filtered}
            errored={Boolean(error)}
            onClearFilters={clearFilters}
            onBrowseTemplates={() => navigate(ADMIN_CERTIFICATE_TEMPLATES_PATH)}
          />
        ) : view === 'grid' ? (
          <DeployedCertificateGallery
            deployments={visible}
            showSkeleton={showSkeleton}
            selectedId={selected?.id}
            onSelect={select}
            onAction={handleAction}
          />
        ) : (
          <DeployedCertificateTable
            deployments={visible}
            showSkeleton={showSkeleton}
            selectedId={selected?.id}
            onSelect={select}
            onAction={handleAction}
          />
        )}
      </div>

      {selected && (
        <DeployedCertificateDetail
          deployment={selected}
          open
          onOpenChange={(next) => !next && setSelectedId(null)}
          onAction={handleAction}
        />
      )}
    </ContentShell>
  )
}
