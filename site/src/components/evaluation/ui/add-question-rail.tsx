import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { QUESTION_TYPE_META, QUESTION_TYPE_ORDER } from '../../../constants/evaluation'
import type { EvaluationQuestionType } from '../../../types/evaluation'

interface AddQuestionRailProps {
  onAdd: (type: EvaluationQuestionType) => void
}

/**
 * The vertical toolbar beside the form — one button per question type. It sticks to
 * the viewport so it is always at hand while scrolling a long questionnaire.
 */
export function AddQuestionRail({ onAdd }: AddQuestionRailProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div
        role="toolbar"
        aria-label="Add question"
        aria-orientation="vertical"
        className="sticky top-4 flex w-12 flex-col items-center gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm"
      >
        {QUESTION_TYPE_ORDER.map((type) => {
          const { label, icon: Icon } = QUESTION_TYPE_META[type]
          return (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Add ${label.toLowerCase()} question`}
                  onClick={() => onAdd(type)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-[var(--cares-primary)] focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none"
                >
                  <Icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
