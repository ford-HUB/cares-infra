import { FORM_SKELETON_CARDS } from '../../constants/evaluation-forms'
import type { EvaluationForm } from '../../types/evaluation'
import { EvaluationFormCard } from './ui/evaluation-form-card'
import { EvaluationFormsGallerySkeleton } from './ui/evaluation-forms-gallery-skeleton'

interface EvaluationFormGalleryProps {
  forms: EvaluationForm[]
  showSkeleton: boolean
  selectedId?: string
  onSelect: (form: EvaluationForm) => void
  onAction: (action: string, form: EvaluationForm) => void
}

/** The default view: the questions are what is being assigned, so they are shown. */
export function EvaluationFormGallery({
  forms,
  showSkeleton,
  selectedId,
  onSelect,
  onAction,
}: EvaluationFormGalleryProps) {
  if (showSkeleton) {
    return <EvaluationFormsGallerySkeleton cards={FORM_SKELETON_CARDS} />
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {forms.map((form) => (
        <EvaluationFormCard
          key={form.id}
          form={form}
          selected={form.id === selectedId}
          onSelect={onSelect}
          onAction={onAction}
        />
      ))}
    </div>
  )
}
