import { ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EvaluationFormsEmptyProps {
  /** True when the library is filtered down to nothing rather than genuinely empty. */
  filtered: boolean
  errored: boolean
  onClearFilters: () => void
  onOpenBuilder: () => void
}

/** Designed zero state — the screen never renders a bare empty grid. */
export function EvaluationFormsEmpty({
  filtered,
  errored,
  onClearFilters,
  onOpenBuilder,
}: EvaluationFormsEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
        <ClipboardList className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="text-[13px] font-semibold text-gray-900">
          {errored
            ? 'Questionnaires could not be loaded'
            : filtered
              ? 'No questionnaire matches these filters'
              : 'No questionnaire has been built yet'}
        </p>
        <p className="text-[12px] text-gray-500">
          {errored
            ? 'Refresh the page to try again.'
            : filtered
              ? 'Clear the search or status filter to see every questionnaire.'
              : 'Build one in the Questionnaire tab, then assign it to the events that should ask it.'}
        </p>
      </div>
      {!errored &&
        (filtered ? (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : (
          <Button size="sm" onClick={onOpenBuilder}>
            Go to Questionnaire
          </Button>
        ))}
    </div>
  )
}
