import { cn } from '@/lib/utils'
import { EVALUATION_FONT_META, QUESTION_TYPE_META } from '../../../constants/evaluation'
import { FORM_CARD_QUESTION_PREVIEW } from '../../../constants/evaluation-forms'
import type { EvaluationForm } from '../../../types/evaluation'

interface FormSheetPreviewProps {
  form: EvaluationForm
  className?: string
}

/**
 * The questionnaire as the volunteer meets it, shrunk to a card header — the same
 * move the certificate gallery makes with the sheet: the thing being assigned is
 * shown, not described. The header keeps its chosen face so a director recognises
 * the form at a glance; the questions below are titles only.
 */
export function FormSheetPreview({ form, className }: FormSheetPreviewProps) {
  const shown = form.questions.slice(0, FORM_CARD_QUESTION_PREVIEW)
  const rest = form.questions.length - shown.length

  return (
    <div
      className={cn(
        'flex h-36 flex-col gap-2 overflow-hidden border-b border-gray-100 bg-gray-50 px-4 pt-3 pb-2',
        className,
      )}
    >
      <div className="shrink-0 border-l-2 border-[var(--cares-primary)] pl-2.5">
        <p
          className="truncate text-[13px] leading-tight font-semibold text-gray-900"
          style={{ fontFamily: EVALUATION_FONT_META[form.headerTypography.fontFamily].stack }}
        >
          {form.title || 'Untitled questionnaire'}
        </p>
        {form.description && (
          <p className="truncate text-[11px] text-gray-500">{form.description}</p>
        )}
      </div>

      {form.questions.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-[11px] text-gray-400">
          No questions yet
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1">
          {shown.map((question) => {
            const Icon = QUESTION_TYPE_META[question.type].icon
            return (
              <li
                key={question.id}
                className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <Icon className="h-3 w-3 shrink-0 text-gray-400" />
                <span className="min-w-0 flex-1 truncate text-[11px] text-gray-700">
                  {question.title || QUESTION_TYPE_META[question.type].label}
                </span>
                {question.required && (
                  <span className="shrink-0 text-[11px] text-red-500">*</span>
                )}
              </li>
            )
          })}
          {rest > 0 && (
            <li className="px-2 text-[11px] text-gray-400 tabular-nums">
              +{rest} more question{rest === 1 ? '' : 's'}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
