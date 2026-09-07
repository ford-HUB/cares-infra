import { CalendarDays, Eye, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CertificateCanvas } from '../../certificate-templates/ui/certificate-canvas'
import { CertificateCategoryBadge } from '../../certificate-templates/ui/certificate-category-badge'
import { formatDateShort, formatNumber } from '../../../constants/formatting'
import type { DeployedCertificate } from '../../../types/deployed-certificate'
import { DeployedCertificateActions } from './deployed-certificate-actions'
import { DeploymentStatusBadge } from './deployment-status-badge'
import { DistributionBar } from './distribution-bar'

interface DeployedCertificateCardProps {
  deployment: DeployedCertificate
  selected: boolean
  onSelect: (deployment: DeployedCertificate) => void
  onAction: (action: string, deployment: DeployedCertificate) => void
}

/**
 * The event leads and the sheet supports it: on this screen a director is chasing a
 * distribution, not shopping for artwork — but the artwork still has to be the one
 * that was signed off in Customization, so the deployed design is drawn as-is.
 */
export function DeployedCertificateCard({
  deployment,
  selected,
  onSelect,
  onAction,
}: DeployedCertificateCardProps) {
  const pending = Math.max(deployment.participants - deployment.distributed, 0)
  const canRemind = pending > 0 && deployment.status !== 'scheduled'

  return (
    <Card
      size="sm"
      className={cn(
        'gap-0 py-0 shadow-sm transition-colors',
        selected && 'ring-2 ring-[var(--cares-primary)]',
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(deployment)}
        className="block w-full cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
      >
        <CertificateCanvas
          design={deployment.design}
          orientation={deployment.orientation}
          title={deployment.templateName}
        />
      </button>

      <CardContent className="space-y-2.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-gray-900">
              {deployment.event.name}
            </p>
            <p className="truncate text-[11px] text-gray-500">
              {deployment.templateName}
            </p>
          </div>
          <DeploymentStatusBadge status={deployment.status} />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <CalendarDays className="h-3 w-3 shrink-0" />
          <span className="truncate">{formatDateShort(deployment.event.date)}</span>
          <span className="text-gray-300">·</span>
          <span className="truncate font-mono">{deployment.reference}</span>
        </div>

        <div className="border-t border-gray-100 pt-2.5">
          <DistributionBar
            distributed={deployment.distributed}
            claimed={deployment.claimed}
            participants={deployment.participants}
            behindMatters={deployment.status === 'distributing'}
          />
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-gray-400">
          <CertificateCategoryBadge category={deployment.category} />
          <span className="truncate tabular-nums">
            {formatNumber(pending)} pending
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex items-center gap-1.5 border-t border-gray-100 px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onAction('preview', deployment)}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </Button>
        <Button
          size="sm"
          className="flex-1"
          disabled={!canRemind}
          title={
            canRemind
              ? undefined
              : 'Nothing to chase — every covered participant has their certificate'
          }
          onClick={() => onAction('remind', deployment)}
        >
          <Send className="h-3.5 w-3.5" />
          Remind
        </Button>
        <DeployedCertificateActions deployment={deployment} onAction={onAction} />
      </CardFooter>
    </Card>
  )
}
