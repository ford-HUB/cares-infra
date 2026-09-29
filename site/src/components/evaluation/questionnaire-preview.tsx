import { QUESTION_TITLE_PLACEHOLDER } from '../../constants/evaluation'
import type { EvaluationForm } from '../../types/evaluation'
import { QuestionAnswerArea } from './ui/question-answer-area'
import { typographyStyles } from '../../utils/evaluation-typography'

interface QuestionnairePreviewProps {
  form: EvaluationForm
}

const noop = () => undefined

/** The questionnaire as a participant will see it — no handles, no controls. */
export function QuestionnairePreview({ form }: QuestionnairePreviewProps) {
  const header = typographyStyles(form.headerTypography)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="h-2.5 bg-[var(--cares-primary)]" />
        <div className="px-5 py-4">
          <p style={header.title} className="font-semibold text-gray-900">
            {form.title || 'Untitled form'}
          </p>
          {form.description && (
            <p style={header.body} className="mt-1 text-gray-600">
              {form.description}
            </p>
          )}
          <p className="mt-3 text-[12px] text-red-500">* Indicates required question</p>
        </div>
      </div>

      {form.questions.map((question, index) => {
        const styles = typographyStyles(question.typography)
        return (
          <div
            key={question.id}
            className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm"
          >
            <p style={styles.title} className="font-medium text-gray-900">
              <span className="mr-1.5 text-gray-400 tabular-nums">{index + 1}.</span>
              {question.title || QUESTION_TITLE_PLACEHOLDER}
              {question.required && (
                <span aria-label="required" className="ml-1 text-red-500">
                  *
                </span>
              )}
            </p>
            {question.description && (
              <p style={styles.body} className="mt-1 text-gray-500">
                {question.description}
              </p>
            )}
            <div className="mt-4">
              <QuestionAnswerArea
                question={question}
                editing={false}
                bodyStyle={styles.body}
                onAddOption={noop}
                onUpdateOption={noop}
                onRemoveOption={noop}
                onPatch={noop}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
