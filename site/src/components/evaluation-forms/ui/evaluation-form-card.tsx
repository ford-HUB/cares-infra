import { CalendarPlus, MessageSquareText, PencilLine, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDateShort, formatNumber } from '../../../constants/formatting'
import type { EvaluationForm } from '../../../types/evaluation'
import { EvaluationFormActions } from './evaluation-form-actions'
import { FormSheetPreview } from './form-sheet-preview'
import { FormStatusBadge } from './form-status-badge'

interface EvaluationFormCardProps {
  form: EvaluationForm
  selected: boolean
  onSelect: (form: EvaluationForm) => void
  onAction: (action: string, form: EvaluationForm) => void
}

/**
 * One questionnaire in the library. The card answers the director's question on this
 * screen — which events is this asking, and has anyone answered it — so reach and
 * responses sit on the face of it and the assign action leads.
 */
export function EvaluationFormCard({
  form,
  selected,
  onSelect,
  onAction,
}: EvaluationFormCardProps) {
  const required = form.questions.filter((question) => question.required).length
  const empty = form.questions.length === 0

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
        onClick={() => onSelect(form)}
        className="block w-full cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
      >
        <FormSheetPreview form={form} />
      </button>

      <CardContent className="space-y-2.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-gray-900">
              {form.title || 'Untitled questionnaire'}
            </p>
            <p className="truncate text-[11px] text-gray-500 tabular-nums">
              {form.questions.length} question{form.questions.length === 1 ? '' : 's'} ·{' '}
              {required} required
            </p>
          </div>
          <FormStatusBadge status={form.status} />
        </div>

        {/* Reach is the point of this screen, so it gets the row of its own. */}
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2.5">
          <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-gray-600">
            <CalendarPlus className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate tabular-nums">
              {form.assignedEvents === 0
                ? 'No events assigned'
                : `${formatNumber(form.assignedEvents)} event${form.assignedEvents === 1 ? '' : 's'}`}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-gray-600">
            <MessageSquareText className="h-3.5 w-3.5 text-gray-400" />
            <span className="tabular-nums">{formatNumber(form.responseCount)}</span>
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-gray-400">
          {form.isDefault ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
              <Star className="h-3 w-3" />
              Default
            </span>
          ) : (
            <span className="truncate">Assigned events only</span>
          )}
          <span className="shrink-0 truncate">
            Updated {formatDateShort(form.updatedAt)}
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex items-center gap-1.5 border-t border-gray-100 px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onAction('edit', form)}
        >
          <PencilLine className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          size="sm"
          className="flex-1"
          disabled={empty}
          title={empty ? 'Add at least one question before assigning it' : undefined}
          onClick={() => onAction('assign', form)}
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Assign
        </Button>
        <EvaluationFormActions form={form} onAction={onAction} />
      </CardFooter>
    </Card>
  )
}
