import { Plus } from 'lucide-react'
import { useEvaluationStore } from '../../store/evaluation-store'
import { useQuestionDrag } from '../../hooks/use-question-drag'
import { AddQuestionRail } from './ui/add-question-rail'
import { FormHeaderCard } from './ui/form-header-card'
import { QuestionCard } from './ui/question-card'
import { QuestionnaireBuilderSkeleton } from './ui/questionnaire-builder-skeleton'

/** Sentinel for "the header card is selected" so a new question lands first. */
const HEADER_ACTIVE = '__header__'

/**
 * The Forms-style editor: header card, one card per question, and the add rail to
 * the right. Reads and writes the evaluation store directly — every edit is a store
 * action so the page stays a thin composition.
 */
export function QuestionnaireBuilder() {
  const form = useEvaluationStore((s) => s.form)
  const initialized = useEvaluationStore((s) => s.formInitialized)
  const activeQuestionId = useEvaluationStore((s) => s.activeQuestionId)
  const setActiveQuestion = useEvaluationStore((s) => s.setActiveQuestion)
  const updateForm = useEvaluationStore((s) => s.updateForm)
  const updateHeaderTypography = useEvaluationStore((s) => s.updateHeaderTypography)
  const addQuestion = useEvaluationStore((s) => s.addQuestion)
  const updateQuestion = useEvaluationStore((s) => s.updateQuestion)
  const changeQuestionType = useEvaluationStore((s) => s.changeQuestionType)
  const duplicateQuestion = useEvaluationStore((s) => s.duplicateQuestion)
  const removeQuestion = useEvaluationStore((s) => s.removeQuestion)
  const moveQuestion = useEvaluationStore((s) => s.moveQuestion)
  const addOption = useEvaluationStore((s) => s.addOption)
  const updateOption = useEvaluationStore((s) => s.updateOption)
  const removeOption = useEvaluationStore((s) => s.removeOption)

  const drag = useQuestionDrag(moveQuestion)

  if (!initialized || !form) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <QuestionnaireBuilderSkeleton />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl items-start gap-4">
      <div className="min-w-0 flex-1 space-y-4">
        <FormHeaderCard
          form={form}
          active={activeQuestionId === HEADER_ACTIVE}
          onActivate={() => setActiveQuestion(HEADER_ACTIVE)}
          onChange={updateForm}
          onTypographyChange={updateHeaderTypography}
        />

        {form.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            total={form.questions.length}
            active={activeQuestionId === question.id}
            dropTarget={drag.overIndex === index && drag.dragIndex !== index}
            onActivate={() => setActiveQuestion(question.id)}
            onPatch={(patch) => updateQuestion(question.id, patch)}
            onChangeType={(type) => changeQuestionType(question.id, type)}
            onDuplicate={() => duplicateQuestion(question.id)}
            onRemove={() => removeQuestion(question.id)}
            onMove={(to) => moveQuestion(index, to)}
            onAddOption={() => addOption(question.id)}
            onUpdateOption={(i, value) => updateOption(question.id, i, value)}
            onRemoveOption={(i) => removeOption(question.id, i)}
            onDragStart={drag.onDragStart(index)}
            onDragOver={drag.onDragOver(index)}
            onDrop={drag.onDrop(index)}
            onDragEnd={drag.onDragEnd}
          />
        ))}

        {form.questions.length === 0 && (
          <button
            type="button"
            onClick={() => addQuestion('short_answer')}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-10 text-gray-500 transition-colors hover:border-[var(--cares-primary)] hover:text-[var(--cares-primary)]"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[13px]">
              No questions yet. Add one here or pick a type from the rail.
            </span>
          </button>
        )}
      </div>

      <AddQuestionRail onAdd={addQuestion} />
    </div>
  )
}
