import dayjs from 'dayjs'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { ANSWER_SUBMITTED_AT_FORMAT, QUESTION_TYPE_META } from '../../../constants/evaluation'
import type {
  EvaluationAnswerValue,
  EvaluationQuestion,
  EvaluationResponse,
} from '../../../types/evaluation'
import { UserAvatar } from '../../portal/ui/user-avatar'
import { AnswerStatusBadge } from './answer-status-badge'
import { StarRating } from './star-rating'

interface AnswerDetailsModalProps {
  response: EvaluationResponse | null
  questions: EvaluationQuestion[]
  onClose: () => void
}

/** Renders one answer in the shape its question type calls for. */
function AnswerValue({
  question,
  value,
}: {
  question: EvaluationQuestion
  value: EvaluationAnswerValue | undefined
}) {
  const empty = value === undefined || value === null || (Array.isArray(value) && !value.length)
  if (empty) {
    return <span className="text-[13px] text-gray-400 italic">No answer</span>
  }

  switch (question.type) {
    case 'star_rating':
      return <StarRating value={Number(value)} max={question.scaleMax} size="md" showValue />

    case 'linear_scale':
      return (
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-green-50 px-2 text-[13px] font-semibold text-[var(--cares-primary)] tabular-nums">
            {String(value)}
          </span>
          <span className="text-[12px] text-gray-400 tabular-nums">of {question.scaleMax}</span>
        </span>
      )

    case 'checkboxes':
      return (
        <ul className="flex flex-wrap gap-1.5">
          {(Array.isArray(value) ? value : [String(value)]).map((item) => (
            <li
              key={item}
              className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] text-gray-700"
            >
              {item}
            </li>
          ))}
        </ul>
      )

    case 'date':
      return (
        <span className="text-[13px] text-gray-900 tabular-nums">
          {dayjs(String(value)).format('MMM D, YYYY')}
        </span>
      )

    case 'paragraph':
      return (
        <p className="text-[13px] leading-relaxed whitespace-pre-line text-gray-900">
          {String(value)}
        </p>
      )

    default:
      return <span className="text-[13px] text-gray-900">{String(value)}</span>
  }
}

/**
 * A participant's full submission. The header mirrors the users master's details
 * modal; below it every question in form order with the answer given.
 */
export function AnswerDetailsModal({ response, questions, onClose }: AnswerDetailsModalProps) {
  useEffect(() => {
    if (!response) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [response, onClose])

  if (!response) return null

  const { participant } = response
  const answered = questions.filter((question) => {
    const value = response.answers[question.id]
    return value !== undefined && value !== null && !(Array.isArray(value) && !value.length)
  }).length

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="answer-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar
              firstName={participant.firstName}
              lastName={participant.lastName}
              size="lg"
            />
            <div className="min-w-0">
              <p id="answer-details-title" className="truncate font-semibold text-gray-900">
                {participant.firstName} {participant.lastName}
              </p>
              <p className="truncate text-sm text-gray-500">{participant.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-gray-100 bg-gray-50/60 px-6 py-3 lg:grid-cols-4">
          <div>
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">Event</p>
            <p className="truncate text-[13px] font-medium text-gray-900" title={response.event}>
              {response.event}
            </p>
          </div>
          <div>
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">Department</p>
            <p className="text-[13px] font-medium text-gray-900">
              {participant.department ?? 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">Submitted</p>
            <p className="text-[13px] font-medium text-gray-900 tabular-nums">
              {dayjs(response.submittedAt).format(ANSWER_SUBMITTED_AT_FORMAT)}
            </p>
          </div>
          <div>
            <p className="text-[11px] tracking-wider text-gray-500 uppercase">Status</p>
            <div className="mt-0.5 flex items-center gap-2">
              <AnswerStatusBadge status={response.status} />
              <span className="text-[12px] text-gray-500 tabular-nums">
                {answered}/{questions.length}
              </span>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          {questions.map((question, index) => {
            const Icon = QUESTION_TYPE_META[question.type].icon
            return (
              <div
                key={question.id}
                className="border-b border-gray-100 py-3 last:border-b-0"
              >
                <div className="mb-1.5 flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500">
                    <Icon className="h-3 w-3" />
                  </span>
                  <p className="text-[13px] text-gray-500">
                    <span className="mr-1 tabular-nums">{index + 1}.</span>
                    {question.title}
                    {question.required && <span className="ml-0.5 text-red-500">*</span>}
                  </p>
                </div>
                <div className="pl-7">
                  <AnswerValue question={question} value={response.answers[question.id]} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-3">
          <span className="text-[12px] text-gray-500">Response ID {response.id}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
