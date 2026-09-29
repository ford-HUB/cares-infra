import { Star } from 'lucide-react'
import { FORM_SKELETON_ROWS } from '../../constants/evaluation-forms'
import { formatDateShort, formatNumber } from '../../constants/formatting'
import type { EvaluationForm } from '../../types/evaluation'
import { EvaluationFormActions } from './ui/evaluation-form-actions'
import { EvaluationFormsTableSkeleton } from './ui/evaluation-forms-table-skeleton'
import { FormStatusBadge } from './ui/form-status-badge'

interface EvaluationFormTableProps {
  forms: EvaluationForm[]
  showSkeleton: boolean
  selectedId?: string
  onSelect: (form: EvaluationForm) => void
  onAction: (action: string, form: EvaluationForm) => void
}

const headCell =
  'px-3 py-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase'

/** The dense view, for comparing reach and answers across every questionnaire at once. */
export function EvaluationFormTable({
  forms,
  showSkeleton,
  selectedId,
  onSelect,
  onAction,
}: EvaluationFormTableProps) {
  return (
    <div
      aria-busy={showSkeleton}
      className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <table className="w-full min-w-3xl border-collapse text-left">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className={headCell}>Questionnaire</th>
            <th className={headCell}>Status</th>
            <th className={`${headCell} text-right`}>Questions</th>
            <th className={`${headCell} text-right`}>Events</th>
            <th className={`${headCell} text-right`}>Answers</th>
            <th className={headCell}>Updated</th>
            <th className={`${headCell} text-right`}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        {showSkeleton ? (
          <EvaluationFormsTableSkeleton rows={FORM_SKELETON_ROWS} />
        ) : (
          <tbody className="divide-y divide-gray-100">
            {forms.map((form) => {
              const isSelected = form.id === selectedId

              return (
                <tr
                  key={form.id}
                  className={`transition-colors ${
                    isSelected ? 'bg-green-50/70' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onSelect(form)}
                      className="block w-full min-w-0 text-left focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-gray-900">
                          {form.title || 'Untitled questionnaire'}
                        </span>
                        {form.isDefault && (
                          <Star
                            aria-label="Default questionnaire"
                            className="h-3 w-3 shrink-0 text-amber-500"
                          />
                        )}
                      </span>
                      <span className="block truncate text-[11px] text-gray-400">
                        {form.description || 'No description'}
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <FormStatusBadge status={form.status} />
                  </td>
                  <td className="px-3 py-2.5 text-right text-[13px] text-gray-700 tabular-nums">
                    {formatNumber(form.questions.length)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[13px] text-gray-700 tabular-nums">
                    {formatNumber(form.assignedEvents)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[13px] text-gray-700 tabular-nums">
                    {formatNumber(form.responseCount)}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-700">
                    {formatDateShort(form.updatedAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end">
                      <EvaluationFormActions form={form} onAction={onAction} />
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
