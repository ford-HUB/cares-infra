import { CertificateCanvas } from '../certificate-templates/ui/certificate-canvas'
import { DEPLOYMENT_SKELETON_ROWS } from '../../constants/deployed-certificates'
import { formatDateShort, formatNumber } from '../../constants/formatting'
import type { DeployedCertificate } from '../../types/deployed-certificate'
import { DeployedCertificateActions } from './ui/deployed-certificate-actions'
import { DeployedCertificatesTableSkeleton } from './ui/deployed-certificates-table-skeleton'
import { DeploymentStatusBadge } from './ui/deployment-status-badge'
import { DistributionBar } from './ui/distribution-bar'

interface DeployedCertificateTableProps {
  deployments: DeployedCertificate[]
  showSkeleton: boolean
  selectedId?: string
  onSelect: (deployment: DeployedCertificate) => void
  onAction: (action: string, deployment: DeployedCertificate) => void
}

const headCell =
  'px-3 py-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase'

/** The dense view, for comparing distribution across every event at once. */
export function DeployedCertificateTable({
  deployments,
  showSkeleton,
  selectedId,
  onSelect,
  onAction,
}: DeployedCertificateTableProps) {
  return (
    <div
      aria-busy={showSkeleton}
      className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <table className="w-full min-w-4xl border-collapse text-left">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className={headCell}>Event</th>
            <th className={headCell}>Certificate</th>
            <th className={headCell}>Status</th>
            <th className={`${headCell} w-56`}>Distribution</th>
            <th className={`${headCell} text-right`}>Participants</th>
            <th className={headCell}>Deployed</th>
            <th className={`${headCell} text-right`}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        {showSkeleton ? (
          <DeployedCertificatesTableSkeleton rows={DEPLOYMENT_SKELETON_ROWS} />
        ) : (
          <tbody className="divide-y divide-gray-100">
            {deployments.map((deployment) => {
              const isSelected = deployment.id === selectedId

              return (
                <tr
                  key={deployment.id}
                  className={`transition-colors ${
                    isSelected ? 'bg-green-50/70' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onSelect(deployment)}
                      className="flex w-full min-w-0 items-center gap-2.5 text-left focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
                    >
                      <CertificateCanvas
                        variant="thumb"
                        design={deployment.design}
                        orientation={deployment.orientation}
                        title={deployment.templateName}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-gray-900">
                          {deployment.event.name}
                        </span>
                        <span className="block truncate text-[11px] text-gray-400">
                          {formatDateShort(deployment.event.date)} ·{' '}
                          {deployment.event.venue}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block truncate text-[13px] text-gray-700">
                      {deployment.templateName}
                    </span>
                    <span className="block font-mono text-[11px] text-gray-400">
                      {deployment.reference}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <DeploymentStatusBadge status={deployment.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <DistributionBar
                      distributed={deployment.distributed}
                      claimed={deployment.claimed}
                      participants={deployment.participants}
                      behindMatters={deployment.status === 'distributing'}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right text-[13px] text-gray-700 tabular-nums">
                    {formatNumber(deployment.participants)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block text-[12px] text-gray-700">
                      {formatDateShort(deployment.deployedAt)}
                    </span>
                    <span className="block text-[11px] text-gray-400">
                      by {deployment.deployedBy}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end">
                      <DeployedCertificateActions
                        deployment={deployment}
                        onAction={onAction}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        )}
      </table>
    </div>
  )
}
