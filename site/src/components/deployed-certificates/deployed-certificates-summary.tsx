import { Award, CalendarCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  DEPLOYMENT_STATUS_BAR_STYLES,
  DEPLOYMENT_STATUS_FILTER_ALL,
  DEPLOYMENT_STATUS_ORDER,
  type DeploymentStatusFilter,
} from '../../constants/deployed-certificates'
import { formatNumber, formatPercent } from '../../constants/formatting'
import type {
  DeployedCertificateCounts,
  DeploymentStatus,
} from '../../types/deployed-certificate'
import { DeploymentStatusSegment } from './ui/deployment-status-segment'

interface DeployedCertificatesSummaryProps {
  counts: DeployedCertificateCounts
  /** The list's current filter — the matching segment reads as selected. */
  status: DeploymentStatusFilter
  onStatusChange: (value: DeploymentStatusFilter) => void
}

/**
 * The screen's one question: of every participant a deployed certificate covers, how
 * many are actually holding theirs. The deployment statuses beside it are parts of a
 * second whole — the deployment log — so they share one bar and double as its filter,
 * and the event count stands apart because it belongs to neither.
 */
export function DeployedCertificatesSummary({
  counts,
  status,
  onStatusChange,
}: DeployedCertificatesSummaryProps) {
  const distributedShare =
    counts.participants > 0 ? counts.distributed / counts.participants : 0
  const claimedWidth =
    counts.participants > 0 ? (counts.claimed / counts.participants) * 100 : 0
  const undeliveredWidth =
    counts.participants > 0
      ? (Math.max(counts.distributed - counts.claimed, 0) / counts.participants) * 100
      : 0

  const statusShare = (value: number) =>
    counts.deployments > 0 ? value / counts.deployments : 0

  const toggle = (next: DeploymentStatus) =>
    onStatusChange(status === next ? DEPLOYMENT_STATUS_FILTER_ALL : next)

  return (
    <TooltipProvider>
      <Card size="sm" className="mb-4 shrink-0 shadow-sm">
        <CardContent className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3 xl:w-64 xl:shrink-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-[11px] tracking-wider text-gray-500 uppercase">
                Certificates distributed
              </p>
              <p className="flex items-baseline gap-1.5">
                <span className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
                  {formatNumber(counts.distributed)}
                </span>
                <span className="text-[13px] text-gray-400 tabular-nums">
                  of {formatNumber(counts.participants)} participants
                </span>
              </p>
              <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                  style={{ width: `${claimedWidth}%` }}
                />
                <div
                  className="h-full rounded-full bg-emerald-200 transition-[width] duration-500"
                  style={{ width: `${undeliveredWidth}%` }}
                />
              </div>
              <p className="flex items-center justify-between text-[11px] text-gray-400 tabular-nums">
                <span>{formatNumber(counts.claimed)} opened</span>
                <span>{formatPercent(distributedShare)} covered</span>
              </p>
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-gray-100 xl:block" />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-gray-100">
              {DEPLOYMENT_STATUS_ORDER.map((one) => (
                <div
                  key={one}
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500',
                    DEPLOYMENT_STATUS_BAR_STYLES[one],
                    status !== DEPLOYMENT_STATUS_FILTER_ALL &&
                      status !== one &&
                      'opacity-30',
                  )}
                  style={{ width: `${statusShare(counts.byStatus[one]) * 100}%` }}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap">
              {DEPLOYMENT_STATUS_ORDER.map((one) => (
                <DeploymentStatusSegment
                  key={one}
                  status={one}
                  value={counts.byStatus[one]}
                  share={statusShare(counts.byStatus[one])}
                  active={status === one}
                  onToggle={toggle}
                />
              ))}
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-gray-100 xl:block" />

          <div className="flex items-center gap-3 xl:w-44 xl:shrink-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <CalendarCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] tracking-wider text-gray-500 uppercase">
                Events covered
              </p>
              <p className="flex items-baseline gap-1.5">
                <span className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
                  {counts.events}
                </span>
                <span className="text-[12px] text-gray-400 tabular-nums">
                  {counts.deployments} deployments
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
