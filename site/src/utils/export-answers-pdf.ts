import dayjs from 'dayjs'
import { ANSWER_STATUS_STYLES, QUESTION_TYPE_META } from '../constants/evaluation'
import { formatNumber } from '../constants/formatting'
import {
  EVALUATION_ANSWERS_PDF_FILENAME,
  PDF_DATE_FORMAT,
  PDF_FILENAME_DATE_FORMAT,
  PDF_GENERATED_AT_FORMAT,
} from '../constants/pdf-export'
import type {
  EvaluationAnswerValue,
  EvaluationForm,
  EvaluationQuestion,
  EvaluationResponse,
} from '../types/evaluation'
import { PdfReport } from './pdf/pdf-report'

interface AnswersPdfOptions {
  /** The form the responses answer; its title and description head the report. */
  form: EvaluationForm | null
  /** The filters in force, in words, so the reader knows what subset they hold. */
  filters: { label: string; value: string }[]
  /** Every response before filtering — for the "N of M" line. */
  total: number
}

function isEmpty(value: EvaluationAnswerValue | undefined): value is undefined | null {
  return value === undefined || value === null || (Array.isArray(value) && !value.length)
}

/** The answer as it would print — the same shape the details modal renders. */
function formatAnswer(question: EvaluationQuestion, value: EvaluationAnswerValue | undefined) {
  if (isEmpty(value)) return '—'
  switch (question.type) {
    case 'star_rating':
      return `${value} / ${question.scaleMax} stars`
    case 'linear_scale':
      return `${value} of ${question.scaleMax}`
    case 'checkboxes':
      return (Array.isArray(value) ? value : [String(value)]).join(', ')
    case 'date':
      return dayjs(String(value)).format(PDF_DATE_FORMAT)
    default:
      return Array.isArray(value) ? value.join(', ') : String(value)
  }
}

/** Compact enough to sit in a table cell without wrapping. */
const SUBMITTED_AT_FORMAT = 'MMM D, YYYY h:mm A'

function share(part: number, whole: number) {
  return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '—'
}

function participantName(response: EvaluationResponse) {
  return `${response.participant.firstName} ${response.participant.lastName}`.trim()
}

/**
 * Tallies one question across every response — option counts for choice questions,
 * a distribution and mean for scales, and how many answered for free text.
 */
function summariseQuestion(
  report: PdfReport,
  question: EvaluationQuestion,
  index: number,
  responses: EvaluationResponse[],
) {
  const values = responses
    .map((response) => response.answers[question.id])
    .filter((value) => !isEmpty(value))
  const answered = values.length
  const meta = QUESTION_TYPE_META[question.type]

  report.subheading(
    `${index + 1}. ${question.title || 'Untitled question'}`,
    `${meta.label} · ${answered} of ${responses.length} answered`,
  )
  if (question.description) report.paragraph(question.description, { muted: true })

  switch (question.type) {
    case 'multiple_choice':
    case 'dropdown':
    case 'checkboxes': {
      const counts = new Map<string, number>(question.options.map((option) => [option, 0]))
      for (const value of values) {
        for (const item of Array.isArray(value) ? value : [String(value)]) {
          counts.set(item, (counts.get(item) ?? 0) + 1)
        }
      }
      report.table(
        ['Option', 'Responses', 'Share of respondents'],
        [...counts].map(([option, count]) => [option, formatNumber(count), share(count, answered)]),
        { numericColumns: [1, 2], columnWidths: { 1: 28, 2: 40 } },
      )
      return
    }

    case 'linear_scale':
    case 'star_rating': {
      const numbers = values.map(Number).filter((n) => !Number.isNaN(n))
      const mean = numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0
      const counts = Array.from({ length: question.scaleMax }, (_, i) => i + 1).map((step) => ({
        step,
        count: numbers.filter((n) => n === step).length,
      }))
      const unit = question.type === 'star_rating' ? 'star' : 'point'
      const labelFor = (step: number) => {
        if (step === 1 && question.scaleMinLabel) return `${step} — ${question.scaleMinLabel}`
        if (step === question.scaleMax && question.scaleMaxLabel) {
          return `${step} — ${question.scaleMaxLabel}`
        }
        return String(step)
      }
      report.table(
        [`Score (${unit}s)`, 'Responses', 'Share of respondents'],
        counts.map(({ step, count }) => [labelFor(step), formatNumber(count), share(count, answered)]),
        {
          numericColumns: [1, 2],
          columnWidths: { 1: 28, 2: 40 },
          foot: [`Average: ${mean.toFixed(2)} of ${question.scaleMax}`, formatNumber(answered), ''],
        },
      )
      return
    }

    default:
      // Free text and dates have no distribution — their answers print per respondent below.
      report.paragraph(
        answered
          ? `${answered} written answer${answered === 1 ? '' : 's'} — see Individual responses.`
          : 'No answers given.',
        { muted: true, italic: true },
      )
  }
}

/**
 * The answers grid as a report: what was asked and how the group answered, then the
 * respondent list, then every submission in full. Filters travel with the export so
 * a PDF of one event reads as exactly that.
 */
export function exportAnswersPdf(
  responses: EvaluationResponse[],
  questions: EvaluationQuestion[],
  { form, filters, total }: AnswersPdfOptions,
) {
  const report = new PdfReport()
  const activeFilters = filters.filter((f) => f.value)
  const complete = responses.filter((r) => r.status === 'complete').length
  const rated = responses.filter((r) => r.rating > 0)
  const averageRating = rated.length
    ? rated.reduce((sum, r) => sum + r.rating, 0) / rated.length
    : 0
  const starMax = questions.find((q) => q.type === 'star_rating')?.scaleMax ?? 5

  report.title(form?.title || 'Evaluation Answers', 'Post-event evaluation responses', [
    ...(form?.description ? [{ label: 'About', value: form.description }] : []),
    {
      label: 'Responses',
      value:
        responses.length === total
          ? `${formatNumber(total)} (all responses)`
          : `${formatNumber(responses.length)} of ${formatNumber(total)} after filters`,
    },
    {
      label: 'Filters',
      value: activeFilters.length
        ? activeFilters.map((f) => `${f.label}: ${f.value}`).join(' · ')
        : 'None',
    },
  ])

  // ── Headline figures ────────────────────────────────────────────────────────
  report.heading('Summary')
  report.facts([
    { label: 'Responses', value: formatNumber(responses.length) },
    {
      label: 'Complete',
      value: formatNumber(complete),
      note: share(complete, responses.length) + ' of responses',
    },
    {
      label: 'Partial',
      value: formatNumber(responses.length - complete),
      note: share(responses.length - complete, responses.length) + ' of responses',
    },
    {
      label: 'Average rating',
      value: rated.length ? `${averageRating.toFixed(1)} / ${starMax}` : '—',
      note: rated.length ? `${formatNumber(rated.length)} rated` : 'No ratings given',
    },
  ])

  // ── Per-question tallies ───────────────────────────────────────────────────
  report.heading('Question summary', `${questions.length} questions`)
  if (!questions.length) {
    report.paragraph('The evaluation form has no questions.', { muted: true, italic: true })
  }
  questions.forEach((question, index) => summariseQuestion(report, question, index, responses))

  // ── Who answered ───────────────────────────────────────────────────────────
  report.heading('Respondents', `${responses.length} listed`)
  report.table(
    ['#', 'Participant', 'Email', 'Department', 'Event', 'Submitted', 'Rating', 'Status'],
    responses.map((response, index) => [
      String(index + 1),
      participantName(response),
      response.participant.email,
      response.participant.department ?? '—',
      response.event,
      dayjs(response.submittedAt).format(SUBMITTED_AT_FORMAT),
      response.rating > 0 ? `${response.rating}/${starMax}` : '—',
      ANSWER_STATUS_STYLES[response.status].label,
    ]),
    {
      numericColumns: [0, 6],
      columnWidths: { 0: 8, 5: 40, 6: 13, 7: 19 },
      emptyMessage: 'No responses match the current filters.',
    },
  )

  // ── Every submission in full ───────────────────────────────────────────────
  if (responses.length && questions.length) {
    report.heading('Individual responses')
    responses.forEach((response, index) => {
      const answered = questions.filter((q) => !isEmpty(response.answers[q.id])).length
      // Keep the respondent's header on the same page as the start of their answers.
      report.ensureSpace(36)
      report.subheading(
        `${index + 1}. ${participantName(response)} — ${response.participant.email}`,
        `${ANSWER_STATUS_STYLES[response.status].label} · ${answered}/${questions.length} answered`,
      )
      report.paragraph(
        [
          `Event: ${response.event}`,
          `Department: ${response.participant.department ?? '—'}`,
          `Submitted: ${dayjs(response.submittedAt).format(PDF_GENERATED_AT_FORMAT)}`,
          `Response ID: ${response.id}`,
        ].join('   ·   '),
        { muted: true },
      )
      report.table(
        ['#', 'Question', 'Answer'],
        questions.map((question, qIndex) => [
          String(qIndex + 1),
          question.title || 'Untitled question',
          formatAnswer(question, response.answers[question.id]),
        ]),
        { numericColumns: [0], columnWidths: { 0: 8, 1: 70 } },
      )
    })
  }

  report.save(`${EVALUATION_ANSWERS_PDF_FILENAME}-${dayjs().format(PDF_FILENAME_DATE_FORMAT)}.pdf`)
}
