import { CalendarDays, Download, MapPin, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CertificateCanvas } from '../certificate-templates/ui/certificate-canvas'
import { CertificateCategoryBadge } from '../certificate-templates/ui/certificate-category-badge'
import { SignatoryAvatar } from '../certificate-templates/ui/signatory-avatar'
import { TEMPLATE_ORIENTATION_LABELS } from '../../constants/certificate-templates'
import { formatDateShort, formatNumber } from '../../constants/formatting'
import type { DeployedCertificate } from '../../types/deployed-certificate'
import { DeploymentStatusBadge } from './ui/deployment-status-badge'
import { DistributionBar } from './ui/distribution-bar'

interface DeployedCertificateDetailProps {
  deployment: DeployedCertificate
  open: boolean
  onOpenChange: (open: boolean) => void
  onAction: (action: string, deployment: DeployedCertificate) => void
}

/**
 * Everything about one deployment the card has no room for. It opens as a modal rather
 * than a side panel so the sheet can be drawn at its true proportions — this is where a
 * director checks that the deployed artwork is the one they signed off — with the
 * distribution figures reading down the column beside it.
 */
export function DeployedCertificateDetail({
  deployment,
  open,
  onOpenChange,
  onAction,
}: DeployedCertificateDetailProps) {
  const pending = Math.max(deployment.participants - deployment.distributed, 0)
  const unopened = Math.max(deployment.distributed - deployment.claimed, 0)
  const canRemind = pending > 0 && deployment.status !== 'scheduled'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[94vw] max-w-5xl flex-col gap-0 p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b border-gray-100 px-5 py-3 pr-12">
          <DialogTitle className="truncate text-[15px]">
            {deployment.event.name}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            <span className="font-mono">{deployment.reference}</span> ·{' '}
            {deployment.templateName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:overflow-hidden">
          {/* The sheet as deployed, at the size it is actually read at. */}
          <div className="h-72 border-b border-gray-100 bg-gray-50 lg:h-auto lg:border-r lg:border-b-0">
            <CertificateCanvas
              variant="full"
              design={deployment.design}
              orientation={deployment.orientation}
              title={deployment.templateName}
            />
          </div>

          <div className="min-w-0 space-y-3 overflow-y-auto px-5 py-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <DeploymentStatusBadge status={deployment.status} />
              <CertificateCategoryBadge category={deployment.category} />
              <span className="text-[11px] text-gray-400">
                {TEMPLATE_ORIENTATION_LABELS[deployment.orientation]}
              </span>
            </div>

            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-[12px] text-gray-500">
                <CalendarDays className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {formatDateShort(deployment.event.date)}
                </span>
              </p>
              <p className="flex items-center gap-1.5 text-[12px] text-gray-500">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{deployment.event.venue}</span>
              </p>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <DistributionBar
                size="lg"
                distributed={deployment.distributed}
                claimed={deployment.claimed}
                participants={deployment.participants}
                behindMatters={deployment.status === 'distributing'}
              />
            </div>

            {/* The three parts of the roster, spelled out under the bar they came from. */}
            <dl className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
              <div>
                <dt className="text-[11px] tracking-wider text-gray-500 uppercase">
                  Opened
                </dt>
                <dd className="text-[15px] leading-tight font-semibold text-gray-900 tabular-nums">
                  {formatNumber(deployment.claimed)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-wider text-gray-500 uppercase">
                  Unopened
                </dt>
                <dd className="text-[15px] leading-tight font-semibold text-gray-900 tabular-nums">
                  {formatNumber(unopened)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-wider text-gray-500 uppercase">
                  Pending
                </dt>
                <dd className="text-[15px] leading-tight font-semibold text-gray-900 tabular-nums">
                  {formatNumber(pending)}
                </dd>
              </div>
            </dl>

            <div className="space-y-1 border-t border-gray-100 pt-3">
              <p className="text-[11px] tracking-wider text-gray-500 uppercase">
                Signatories
              </p>
              <ul className="space-y-0.5">
                {deployment.design.signatories.map((signatory) => (
                  <li key={signatory.id} className="flex items-center gap-2">
                    <SignatoryAvatar
                      name={signatory.name}
                      avatarUrl={signatory.avatarUrl}
                      size="sm"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] text-gray-700">
                        {signatory.name}
                      </span>
                      <span className="block truncate text-[11px] text-gray-400">
                        {signatory.title} · {signatory.department}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="border-t border-gray-100 pt-3 text-[11px] text-gray-400">
              Deployed {formatDateShort(deployment.deployedAt)} by{' '}
              {deployment.deployedBy}
            </p>
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 items-center gap-2 rounded-b-xl border-t border-gray-100 px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction('export', deployment)}
          >
            Export recipient list
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction('download', deployment)}
          >
            <Download className="h-3.5 w-3.5" />
            Download sheets
          </Button>
          <Button
            size="sm"
            disabled={!canRemind}
            title={
              canRemind
                ? undefined
                : 'Nothing to chase — every covered participant has their certificate'
            }
            onClick={() => onAction('remind', deployment)}
          >
            <Send className="h-3.5 w-3.5" />
            Remind {formatNumber(pending)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
