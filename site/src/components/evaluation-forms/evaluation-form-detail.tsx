import { CalendarPlus, MapPin, PencilLine, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { QUESTION_TYPE_META } from '../../constants/evaluation'
import { formatDateShort, formatNumber } from '../../constants/formatting'
import type { EvaluationAssignment, EvaluationForm } from '../../types/evaluation'
import { FormStatusBadge } from './ui/form-status-badge'

interface EvaluationFormDetailProps {
  form: EvaluationForm
  /** Only this questionnaire's assignments — the page filters before passing them. */
  assignments: EvaluationAssignment[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onAction: (action: string, form: EvaluationForm) => void
  onUnassign: (assignment: EvaluationAssignment) => void
}

/**
 * What this questionnaire asks and where it is asked. The two lists are the whole
 * record a director checks before assigning it again, so they sit side by side
 * rather than behind tabs.
 */
export function EvaluationFormDetail({
  form,
  assignments,
  open,
  onOpenChange,
  onAction,
  onUnassign,
}: EvaluationFormDetailProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-gray-100 px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <span className="truncate">{form.title || 'Untitled questionnaire'}</span>
            <FormStatusBadge status={form.status} />
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {form.description || 'No description.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-2">
          <section className="min-h-0 overflow-y-auto border-b border-gray-100 px-4 py-3 md:border-r md:border-b-0">
            <h3 className="mb-2 text-[11px] tracking-wider text-gray-500 uppercase">
              Questions ({form.questions.length})
            </h3>
            {form.questions.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-gray-400">
                No questions yet — open it in the builder to add some.
              </p>
            ) : (
              <ol className="space-y-1.5">
                {form.questions.map((question, index) => {
                  const meta = QUESTION_TYPE_META[question.type]
                  const Icon = meta.icon
                  return (
                    <li
                      key={question.id}
                      className="flex items-start gap-2.5 rounded-lg border border-gray-100 px-2.5 py-2"
                    >
                      <span className="w-4 shrink-0 pt-0.5 text-[11px] text-gray-400 tabular-nums">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-gray-900">
                          {question.title || meta.label}
                          {question.required && (
                            <span className="ml-1 text-red-500">*</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>

          <section className="min-h-0 overflow-y-auto px-4 py-3">
            <h3 className="mb-2 text-[11px] tracking-wider text-gray-500 uppercase">
              Assigned events ({assignments.length})
            </h3>
            {assignments.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-gray-400">
                {form.isDefault
                  ? 'No event assigned — it is asked wherever no other questionnaire is.'
                  : 'No event asks this yet. Assign it to put it in front of volunteers.'}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {assignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="flex items-start gap-2 rounded-lg border border-gray-100 px-2.5 py-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-gray-900">
                        {assignment.eventTitle}
                      </span>
                      <span className="flex items-center gap-1 truncate text-[11px] text-gray-400">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {assignment.eventLocation} ·{' '}
                        {formatDateShort(assignment.eventStarted)} ·{' '}
                        {formatNumber(assignment.participants)} participants
                      </span>
                      {assignment.assignedBy && (
                        <span className="block truncate text-[11px] text-gray-400">
                          Assigned by {assignment.assignedBy}
                        </span>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Unassign ${assignment.eventTitle}`}
                      title="Put this event back on the default questionnaire"
                      onClick={() => onUnassign(assignment)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-gray-100 px-4 py-3">
          <Button variant="outline" size="sm" onClick={() => onAction('edit', form)}>
            <PencilLine className="h-3.5 w-3.5" />
            Open in builder
          </Button>
          <Button
            size="sm"
            disabled={form.questions.length === 0}
            onClick={() => onAction('assign', form)}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Assign to event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
