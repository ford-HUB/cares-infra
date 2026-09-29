import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { analyseCpu, cpuBusy } from '../../constants/system-performance'
import type {
  CpuCore,
  HealthState,
  PerformanceSample,
  ProcessLoad,
} from '../../types/system-performance'
import { CoreLoadGrid } from './ui/core-load-grid'
import { ProcessLoadList } from './ui/process-load-list'

interface CpuAnalysisCardProps {
  sample: PerformanceSample
  cores: CpuCore[]
  processes: ProcessLoad[]
}

const FINDING_ICON = {
  healthy: CheckCircle2,
  strained: AlertTriangle,
  critical: AlertTriangle,
} as const

/** Icon + wording carry the finding as well as the tint, never colour alone. */
const FINDING_STYLES: Record<HealthState, string> = {
  healthy: 'bg-emerald-50 text-emerald-700',
  strained: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
}

/**
 * The analysis half of the page: the chart says what CPU is doing, this says what it
 * means and where to look. Findings are thresholds on values already on screen, so a
 * reader can always trace a sentence back to a number above it.
 */
export function CpuAnalysisCard({ sample, cores, processes }: CpuAnalysisCardProps) {
  const findings = analyseCpu(sample, cores, processes)
  const busy = cpuBusy(sample)

  return (
    <TooltipProvider>
      <Card className="mb-4 gap-0 shadow-sm">
        <CardContent className="space-y-5">
          <div>
            <p className="text-[15px] font-semibold text-gray-900">CPU analysis</p>
            <p className="mt-0.5 text-[13px] text-gray-600">
              Read from the live sample: which cores are carrying the load, what is
              spending it, and whether that is a problem.
            </p>
          </div>

          <ul className="space-y-2">
            {findings.map((finding) => {
              const Icon = FINDING_ICON[finding.state] ?? Info
              return (
                <li
                  key={finding.id}
                  className="flex gap-3 rounded-lg border border-gray-100 p-3"
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      FINDING_STYLES[finding.state],
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-gray-900">
                      {finding.title}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-gray-600">
                      {finding.detail}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>

          <div className="grid grid-cols-1 gap-6 border-t border-gray-100 pt-5 lg:grid-cols-2">
            <CoreLoadGrid cores={cores} />
            <ProcessLoadList processes={processes} busyPercent={busy} />
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
