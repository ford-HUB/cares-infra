import {
  DEPLOYMENT_STATUS_BADGE_STYLES,
  DEPLOYMENT_STATUS_DOT_STYLES,
  DEPLOYMENT_STATUS_LABELS,
} from '../../../constants/deployed-certificates'
import type { DeploymentStatus } from '../../../types/deployed-certificate'

/** Dense status pill, shared by the deployment card, the table row and the panel. */
export function DeploymentStatusBadge({ status }: { status: DeploymentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${DEPLOYMENT_STATUS_BADGE_STYLES[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${DEPLOYMENT_STATUS_DOT_STYLES[status]} ${
          status === 'distributing' ? 'animate-pulse' : ''
        }`}
      />
      {DEPLOYMENT_STATUS_LABELS[status]}
    </span>
  )
}
