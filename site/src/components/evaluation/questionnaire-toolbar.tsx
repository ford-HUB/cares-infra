import { Eye, Save } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { EvaluationForm } from '../../types/evaluation'

interface QuestionnaireToolbarProps {
  form: EvaluationForm | null
  initialized: boolean
  dirty: boolean
  saving: boolean
  previewing: boolean
  onTogglePreview: () => void
  onSave: () => void
}

/** Page header for the builder — the counts, the draft state, and the save action. */
export function QuestionnaireToolbar({
  form,
  initialized,
  dirty,
  saving,
  previewing,
  onTogglePreview,
  onSave,
}: QuestionnaireToolbarProps) {
  const required = form?.questions.filter((q) => q.required).length ?? 0

  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Questionnaire</h1>
        {initialized && form ? (
          <>
            <p className="text-[13px] text-gray-500 tabular-nums">
              {form.questions.length} questions · {required} required
            </p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] ${
                dirty ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${dirty ? 'bg-amber-500' : 'bg-gray-400'}`}
              />
              {dirty ? 'Unsaved changes' : 'Draft'}
            </span>
          </>
        ) : (
          <>
            <Skeleton aria-hidden className="h-3.5 w-32" />
            <Skeleton aria-hidden className="h-5 w-16 rounded-full" />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onTogglePreview}
          aria-pressed={previewing}
          className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] transition-colors ${
            previewing
              ? 'border-[var(--cares-primary)] bg-green-50 text-[var(--cares-primary)]'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          {previewing ? 'Back to editing' : 'Preview'}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || saving}
          className="flex h-9 items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-3 text-[13px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
