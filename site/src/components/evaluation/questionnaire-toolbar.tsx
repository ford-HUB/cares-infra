import { Eye, Save, Send } from 'lucide-react'
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
  /** Saves and makes the questionnaire the one volunteers answer after an event. */
  onPublish: () => void
}

/** The chip's copy per state — unsaved edits win over the stored status. */
function statusChip(form: EvaluationForm, dirty: boolean) {
  if (dirty) return { label: 'Unsaved changes', badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' }
  if (form.status === 'published')
    return { label: 'Published', badge: 'bg-green-50 text-green-700', dot: 'bg-green-500' }
  return { label: 'Draft', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }
}

/** Page header for the builder — the counts, the publish state, and the save actions. */
export function QuestionnaireToolbar({
  form,
  initialized,
  dirty,
  saving,
  previewing,
  onTogglePreview,
  onSave,
  onPublish,
}: QuestionnaireToolbarProps) {
  const required = form?.questions.filter((q) => q.required).length ?? 0
  const chip = form ? statusChip(form, dirty) : null
  const canPublish = !!form && form.questions.length > 0 && !saving

  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Questionnaire</h1>
        {initialized && form ? (
          <>
            <p className="text-[13px] text-gray-500 tabular-nums">
              {form.questions.length} questions · {required} required
            </p>
            {chip && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] ${chip.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${chip.dot}`} />
                {chip.label}
              </span>
            )}
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
          className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving…' : form?.status === 'published' ? 'Save changes' : 'Save draft'}
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={!canPublish || (!dirty && form?.status === 'published')}
          title={
            form && form.questions.length === 0
              ? 'Add at least one question before publishing'
              : undefined
          }
          className="flex h-9 items-center gap-2 rounded-lg bg-[var(--cares-primary)] px-3 text-[13px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {form?.status === 'published' ? 'Publish changes' : 'Publish'}
        </button>
      </div>
    </div>
  )
}
