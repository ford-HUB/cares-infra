import { CalendarCheck, MessageSquareText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  FORM_STATUS_FILTER_ALL,
  FORM_STATUS_ORDER,
  type FormStatus,
  type FormStatusFilter,
} from '../../constants/evaluation-forms'
import { formatNumber, formatPercent } from '../../constants/formatting'
import type { EvaluationFormCounts } from '../../types/evaluation'
import { FormStatusSegment } from './ui/form-status-segment'

interface EvaluationFormsSummaryProps {
  counts: EvaluationFormCounts
  /** The list's current filter — the matching segment reads as selected. */
  status: FormStatusFilter
  onStatusChange: (value: FormStatusFilter) => void
}

/**
 * The screen's one question: of every event, how many ask questions chosen for them
 * rather than the default questionnaire. The questionnaire statuses beside it are
 * parts of a second whole — the library — so they share one bar and double as its
 * filter, and the answer count stands apart because it belongs to neither.
 */
export function EvaluationFormsSummary({
  counts,
  status,
  onStatusChange,
}: EvaluationFormsSummaryProps) {
  const events = counts.assignedEvents + counts.unassignedEvents
  const coveredShare = events > 0 ? counts.assignedEvents / events : 0
  const assignedWidth = coveredShare * 100
  const fallbackWidth = events > 0 ? (counts.unassignedEvents / events) * 100 : 0

  const statusValue = (value: FormStatus) =>
    value === 'published' ? counts.published : counts.draft
  const statusShare = (value: number) => (counts.forms > 0 ? value / counts.forms : 0)

  const toggle = (next: FormStatus) =>
    onStatusChange(status === next ? FORM_STATUS_FILTER_ALL : next)

  return (
    <TooltipProvider>
      <Card size="sm" className="mb-4 shrink-0 shadow-sm">
        <CardContent className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3 xl:w-72 xl:shrink-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-[11px] tracking-wider text-gray-500 uppercase">
                Events with their own questions
              </p>
              <p className="flex items-baseline gap-1.5">
                <span className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
                  {formatNumber(counts.assignedEvents)}
                </span>
                <span className="text-[13px] text-gray-400 tabular-nums">
                  of {formatNumber(events)} events
                </span>
              </p>
              <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                  style={{ width: `${assignedWidth}%` }}
                />
                <div
                  className="h-full rounded-full bg-emerald-200 transition-[width] duration-500"
                  style={{ width: `${fallbackWidth}%` }}
                />
              </div>
              <p className="flex items-center justify-between text-[11px] text-gray-400 tabular-nums">
                <span>{formatNumber(counts.unassignedEvents)} on the default</span>
                <span>{formatPercent(coveredShare)} assigned</span>
              </p>
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-gray-100 xl:block" />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-gray-100">
              {FORM_STATUS_ORDER.map((value) => (
                <div
                  key={value}
                  className={`h-full rounded-full transition-[width] duration-500 ${
                    value === 'published' ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                  style={{ width: `${statusShare(statusValue(value)) * 100}%` }}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {FORM_STATUS_ORDER.map((value) => (
                <FormStatusSegment
                  key={value}
                  status={value}
                  value={statusValue(value)}
                  share={statusShare(statusValue(value))}
                  active={status === value}
                  onToggle={toggle}
                />
              ))}
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-gray-100 xl:block" />

          <div className="flex items-center gap-3 xl:w-44 xl:shrink-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <MessageSquareText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] tracking-wider text-gray-500 uppercase">
                Answers received
              </p>
              <p className="text-2xl leading-tight font-semibold text-gray-900 tabular-nums">
                {formatNumber(counts.responses)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
