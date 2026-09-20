import { CheckSquare, ChevronDown, CircleDot, Plus, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import {
  LINEAR_SCALE_MAX,
  LINEAR_SCALE_MIN,
  QUESTION_MAX_OPTIONS,
  STAR_RATING_MAX,
  STAR_RATING_MIN,
} from '../../../constants/evaluation'
import type { EvaluationQuestion } from '../../../types/evaluation'
import { StarRating } from './star-rating'

interface QuestionAnswerAreaProps {
  question: EvaluationQuestion
  /** Editing controls (option inputs, scale bounds) are only drawn on the active card. */
  editing: boolean
  bodyStyle: CSSProperties
  onAddOption: () => void
  onUpdateOption: (index: number, value: string) => void
  onRemoveOption: (index: number) => void
  onPatch: (patch: Partial<EvaluationQuestion>) => void
}

const rangeOptions = (min: number, max: number) =>
  Array.from({ length: max - min + 1 }, (_, index) => min + index)

const boundInputClass =
  'h-8 w-32 rounded-md border border-gray-200 bg-white px-2 text-[12px] text-gray-700 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none'

/**
 * The part of a card the participant would fill in. In edit mode the choices and
 * scale bounds are inputs; collapsed, it reads as the finished form would.
 */
export function QuestionAnswerArea({
  question,
  editing,
  bodyStyle,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
  onPatch,
}: QuestionAnswerAreaProps) {
  switch (question.type) {
    case 'short_answer':
      return (
        <p
          style={bodyStyle}
          className="w-1/2 border-b border-dashed border-gray-300 pb-1 text-gray-400"
        >
          Short answer text
        </p>
      )

    case 'paragraph':
      return (
        <p
          style={bodyStyle}
          className="w-full border-b border-dashed border-gray-300 pb-1 text-gray-400"
        >
          Long answer text
        </p>
      )

    case 'date':
      return (
        <p
          style={bodyStyle}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-gray-400"
        >
          Month, day, year
        </p>
      )

    case 'multiple_choice':
    case 'checkboxes':
    case 'dropdown': {
      const Marker =
        question.type === 'multiple_choice'
          ? CircleDot
          : question.type === 'checkboxes'
            ? CheckSquare
            : null
      return (
        <ul className="space-y-1.5">
          {question.options.map((option, index) => (
            <li key={index} className="flex items-center gap-2.5">
              {Marker ? (
                <Marker className="h-4 w-4 shrink-0 text-gray-300" />
              ) : (
                <span className="w-4 shrink-0 text-right text-[12px] text-gray-400 tabular-nums">
                  {index + 1}.
                </span>
              )}
              {editing ? (
                <>
                  <input
                    aria-label={`Option ${index + 1}`}
                    value={option}
                    onChange={(event) => onUpdateOption(index, event.target.value)}
                    style={bodyStyle}
                    className="min-w-0 flex-1 border-b border-transparent bg-transparent py-0.5 text-gray-800 hover:border-gray-200 focus:border-[var(--cares-primary)] focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label={`Remove option ${index + 1}`}
                    disabled={question.options.length <= 1}
                    onClick={() => onRemoveOption(index)}
                    className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-30"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <span style={bodyStyle} className="truncate text-gray-700">
                  {option || `Option ${index + 1}`}
                </span>
              )}
            </li>
          ))}
          {editing && question.options.length < QUESTION_MAX_OPTIONS && (
            <li className="flex items-center gap-2.5">
              {Marker ? (
                <Marker className="h-4 w-4 shrink-0 text-gray-200" />
              ) : (
                <span className="w-4 shrink-0" />
              )}
              <button
                type="button"
                onClick={onAddOption}
                className="inline-flex items-center gap-1 text-[13px] text-gray-500 transition-colors hover:text-[var(--cares-primary)]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add option
              </button>
            </li>
          )}
          {!editing && question.type === 'dropdown' && (
            <li className="pt-1">
              <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-[13px] text-gray-400">
                Choose
                <ChevronDown className="h-3.5 w-3.5" />
              </span>
            </li>
          )}
        </ul>
      )
    }

    case 'linear_scale':
      return (
        <div className="space-y-3">
          {editing && (
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-gray-500">
              <span>1</span>
              <span>to</span>
              <select
                aria-label="Scale upper bound"
                value={question.scaleMax}
                onChange={(event) => onPatch({ scaleMax: Number(event.target.value) })}
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-[12px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
              >
                {rangeOptions(LINEAR_SCALE_MIN, LINEAR_SCALE_MAX).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <input
                aria-label="Label for 1"
                placeholder="Label for 1 (optional)"
                value={question.scaleMinLabel}
                onChange={(event) => onPatch({ scaleMinLabel: event.target.value })}
                className={boundInputClass}
              />
              <input
                aria-label={`Label for ${question.scaleMax}`}
                placeholder={`Label for ${question.scaleMax} (optional)`}
                value={question.scaleMaxLabel}
                onChange={(event) => onPatch({ scaleMaxLabel: event.target.value })}
                className={boundInputClass}
              />
            </div>
          )}
          <div className="flex items-end gap-3">
            {question.scaleMinLabel && (
              <span style={bodyStyle} className="pb-1 text-gray-500">
                {question.scaleMinLabel}
              </span>
            )}
            <div className="flex flex-1 items-end justify-between">
              {rangeOptions(1, question.scaleMax).map((n) => (
                <span key={n} className="flex flex-col items-center gap-1.5">
                  <span className="text-[12px] text-gray-500 tabular-nums">{n}</span>
                  <span className="h-4 w-4 rounded-full border border-gray-300" />
                </span>
              ))}
            </div>
            {question.scaleMaxLabel && (
              <span style={bodyStyle} className="pb-1 text-gray-500">
                {question.scaleMaxLabel}
              </span>
            )}
          </div>
        </div>
      )

    case 'star_rating':
      return (
        <div className="space-y-3">
          {editing && (
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-gray-500">
              <span>Stars</span>
              <select
                aria-label="Number of stars"
                value={question.scaleMax}
                onChange={(event) => onPatch({ scaleMax: Number(event.target.value) })}
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-[12px] text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[var(--cares-primary)] focus:outline-none"
              >
                {rangeOptions(STAR_RATING_MIN, STAR_RATING_MAX).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <input
                aria-label="Label for lowest star"
                placeholder="Lowest label (optional)"
                value={question.scaleMinLabel}
                onChange={(event) => onPatch({ scaleMinLabel: event.target.value })}
                className={boundInputClass}
              />
              <input
                aria-label="Label for highest star"
                placeholder="Highest label (optional)"
                value={question.scaleMaxLabel}
                onChange={(event) => onPatch({ scaleMaxLabel: event.target.value })}
                className={boundInputClass}
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            {question.scaleMinLabel && (
              <span style={bodyStyle} className="text-gray-500">
                {question.scaleMinLabel}
              </span>
            )}
            <StarRating value={0} max={question.scaleMax} size="md" />
            {question.scaleMaxLabel && (
              <span style={bodyStyle} className="text-gray-500">
                {question.scaleMaxLabel}
              </span>
            )}
          </div>
        </div>
      )
  }
}
