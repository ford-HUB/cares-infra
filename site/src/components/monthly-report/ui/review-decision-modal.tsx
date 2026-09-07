import { useState } from 'react'
import { CheckCircle2, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatReportPeriod } from '../../../constants/monthly-report'
import type { MonthlyReport } from '../../../types/monthly-report'

type Decision = 'approved' | 'returned'

interface ReviewDecisionModalProps {
  report: MonthlyReport
  decision: Decision
  saving: boolean
  onClose: () => void
  onSubmit: (note: string) => void
}

/**
 * Approving files the report under its department; returning sends it back. The note
 * is optional on an approval and required on a return — it is the only thing the
 * coordinator receives to act on.
 */
export function ReviewDecisionModal({
  report,
  decision,
  saving,
  onClose,
  onSubmit,
}: ReviewDecisionModalProps) {
  const [note, setNote] = useState('')

  const returning = decision === 'returned'
  const invalid = returning && note.trim().length === 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={returning ? 'Return report for revision' : 'Approve report'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                returning ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600',
              )}
            >
              {returning ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold text-gray-900">
                {returning ? 'Return for revision' : 'Approve report'}
              </h3>
              <p className="truncate text-[12px] text-gray-500">
                {report.reference} · {formatReportPeriod(report.period)} ·{' '}
                {report.department}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <p className="text-[13px] text-gray-600">
            {returning
              ? `${report.submittedBy.name} will see this note and can resubmit a corrected copy.`
              : `The report will be filed under ${report.department} for ${formatReportPeriod(report.period)}.`}
          </p>

          <div>
            <label
              htmlFor="decision-note"
              className="text-[11px] tracking-wider text-gray-500 uppercase"
            >
              {returning ? 'What needs fixing' : 'Note (optional)'}
            </label>
            <textarea
              id="decision-note"
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                returning
                  ? 'e.g. Service hours in the narrative do not match the attendance sheet.'
                  : 'Anything the coordinator should know.'
              }
              className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-gray-200 px-3 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={invalid || saving}
            onClick={() => onSubmit(note)}
            className={cn(
              'h-9 rounded-lg px-3 text-[13px] font-medium text-white transition-colors disabled:opacity-50',
              returning ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700',
            )}
          >
            {returning ? 'Return report' : 'Approve report'}
          </button>
        </div>
      </div>
    </div>
  )
}
