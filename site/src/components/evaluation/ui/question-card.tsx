import { ArrowDown, ArrowUp, Copy, GripHorizontal, Trash2 } from 'lucide-react'
import type { DragEvent } from 'react'
import { Switch } from '@/components/ui/switch'
import {
  QUESTION_DESCRIPTION_PLACEHOLDER,
  QUESTION_TITLE_PLACEHOLDER,
  QUESTION_TYPE_META,
  QUESTION_TYPE_ORDER,
} from '../../../constants/evaluation'
import type { EvaluationQuestion, EvaluationQuestionType } from '../../../types/evaluation'
import { QuestionAnswerArea } from './question-answer-area'
import { TypographyControls } from './typography-controls'
import { typographyStyles } from '../../../utils/evaluation-typography'

interface QuestionCardProps {
  question: EvaluationQuestion
  index: number
  total: number
  active: boolean
  /** True while another card is being dragged over this one — draws the drop line. */
  dropTarget: boolean
  onActivate: () => void
  onPatch: (patch: Partial<EvaluationQuestion>) => void
  onChangeType: (type: EvaluationQuestionType) => void
  onDuplicate: () => void
  onRemove: () => void
  onMove: (to: number) => void
  onAddOption: () => void
  onUpdateOption: (index: number, value: string) => void
  onRemoveOption: (index: number) => void
  onDragStart: (event: DragEvent<HTMLDivElement>) => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
}

const iconButtonClass =
  'rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-[var(--cares-primary)] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30'

/**
 * One question, Forms-style: a collapsed card reads like the finished form; the active
 * card grows the title/description inputs, the type picker, the option editor and the
 * footer controls. The grip on top is the drag handle.
 */
export function QuestionCard({
  question,
  index,
  total,
  active,
  dropTarget,
  onActivate,
  onPatch,
  onChangeType,
  onDuplicate,
  onRemove,
  onMove,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: QuestionCardProps) {
  const styles = typographyStyles(question.typography)
  const TypeIcon = QUESTION_TYPE_META[question.type].icon

  return (
    <div
      role="group"
      aria-label={`Question ${index + 1}`}
      data-question-id={question.id}
      onClick={onActivate}
      onFocusCapture={onActivate}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative rounded-xl border bg-white shadow-sm transition-colors ${
        active
          ? 'border-[var(--cares-primary)] border-l-4 border-l-[var(--cares-primary)]'
          : 'border-gray-200 hover:border-gray-300'
      } ${dropTarget ? 'ring-2 ring-[var(--cares-primary)]/40' : ''}`}
    >
      {/* Drag handle — the whole strip, not just the icon, so it is easy to grab. */}
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        aria-label="Drag to reorder"
        title="Drag to reorder"
        className="flex h-6 cursor-grab items-center justify-center text-gray-300 hover:text-gray-500 active:cursor-grabbing"
      >
        <GripHorizontal className="h-4 w-4" />
      </div>

      <div className="px-5 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            {active ? (
              <input
                aria-label="Question title"
                value={question.title}
                placeholder={QUESTION_TITLE_PLACEHOLDER}
                onChange={(event) => onPatch({ title: event.target.value })}
                style={styles.title}
                className="w-full rounded-md border-b-2 border-gray-200 bg-gray-50 px-3 py-2 font-medium text-gray-900 placeholder:text-gray-400 focus:border-[var(--cares-primary)] focus:outline-none"
              />
            ) : (
              <p style={styles.title} className="font-medium text-gray-900">
                {question.title || QUESTION_TITLE_PLACEHOLDER}
                {question.required && (
                  <span aria-label="required" className="ml-1 text-red-500">
                    *
                  </span>
                )}
              </p>
            )}

            {active ? (
              <input
                aria-label="Question description"
                value={question.description}
                placeholder={QUESTION_DESCRIPTION_PLACEHOLDER}
                onChange={(event) => onPatch({ description: event.target.value })}
                style={styles.body}
                className="mt-2 w-full border-b border-gray-200 bg-transparent px-1 py-1 text-gray-600 placeholder:text-gray-400 focus:border-[var(--cares-primary)] focus:outline-none"
              />
            ) : (
              question.description && (
                <p style={styles.body} className="mt-1 text-gray-500">
                  {question.description}
                </p>
              )
            )}
          </div>

          {active && (
            <div className="relative shrink-0">
              <TypeIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <select
                aria-label="Question type"
                value={question.type}
                onChange={(event) =>
                  onChangeType(event.target.value as EvaluationQuestionType)
                }
                className="h-10 w-52 rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[13px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
              >
                {QUESTION_TYPE_ORDER.map((type) => (
                  <option key={type} value={type}>
                    {QUESTION_TYPE_META[type].label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-4">
          <QuestionAnswerArea
            question={question}
            editing={active}
            bodyStyle={styles.body}
            onAddOption={onAddOption}
            onUpdateOption={onUpdateOption}
            onRemoveOption={onRemoveOption}
            onPatch={onPatch}
          />
        </div>

        {active && (
          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-3 lg:flex-row lg:items-center lg:justify-between">
            <TypographyControls
              label={`Question ${index + 1}`}
              value={question.typography}
              onChange={(patch) =>
                onPatch({ typography: { ...question.typography, ...patch } })
              }
            />

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => onMove(index - 1)}
                className={iconButtonClass}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={index === total - 1}
                onClick={() => onMove(index + 1)}
                className={iconButtonClass}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Duplicate question"
                title="Duplicate"
                onClick={onDuplicate}
                className={iconButtonClass}
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Delete question"
                title="Delete"
                onClick={onRemove}
                className={`${iconButtonClass} hover:bg-red-50 hover:text-red-600`}
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <span aria-hidden className="mx-2 h-6 w-px bg-gray-200" />

              <label className="flex items-center gap-2 text-[13px] text-gray-700">
                Required
                <Switch
                  checked={question.required}
                  onCheckedChange={(checked) => onPatch({ required: checked })}
                  aria-label="Required"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
