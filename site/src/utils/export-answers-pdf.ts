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
  /** Set when every response answers one form. */
  form: EvaluationForm | null
  /** Events can ask different questionnaires, so read each response against its own. */
  questionsFor: (response: EvaluationResponse) => EvaluationQuestion[]
  filters: { label: string; value: string }[]
  total: number
}

function isEmpty(value: EvaluationAnswerValue | undefined): value is undefined | null {
  return value === undefined || value === null || (Array.isArray(value) && !value.length)
}

/** Same shape the details modal renders. */
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
    case 'image_upload': {
      const count = Array.isArray(value) ? value.length : 1
      return `${count} image${count === 1 ? '' : 's'} attached (view in the portal)`
    }
    default:
      return Array.isArray(value) ? value.join(', ') : String(value)
  }
}

const SUBMITTED_AT_FORMAT = 'MMM D, YYYY h:mm A'

function share(part: number, whole: number) {
  return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '—'
}

function participantName(response: EvaluationResponse) {
  return `${response.participant.firstName} ${response.participant.lastName}`.trim()
}

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

    case 'image_upload': {
      const images = values.reduce<number>(
        (sum, value) => sum + (Array.isArray(value) ? value.length : 1),
        0,
      )
      report.paragraph(
        answered
          ? `${answered} respondent${answered === 1 ? '' : 's'} attached ${images} image${images === 1 ? '' : 's'} — open a response in the portal to view them.`
          : 'No images attached.',
        { muted: true, italic: true },
      )
      return
    }

    default:
      report.paragraph(
        answered
          ? `${answered} written answer${answered === 1 ? '' : 's'} — see Individual responses.`
          : 'No answers given.',
        { muted: true, italic: true },
      )
  }
}

export function exportAnswersPdf(
  responses: EvaluationResponse[],
  questions: EvaluationQuestion[],
  { form, questionsFor, filters, total }: AnswersPdfOptions,
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

  report.heading('Question summary', `${questions.length} questions`)
  if (!questions.length) {
    report.paragraph('The evaluation form has no questions.', { muted: true, italic: true })
  }
  questions.forEach((question, index) =>
    summariseQuestion(
      report,
      question,
      index,
      // Otherwise a questionnaire that never asked it reads as everyone declining.
      responses.filter((response) =>
        questionsFor(response).some((one) => one.id === question.id),
      ),
    ),
  )

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

  if (responses.length && questions.length) {
    report.heading('Individual responses')
    responses.forEach((response, index) => {
      const asked = questionsFor(response)
      const answered = asked.filter((q) => !isEmpty(response.answers[q.id])).length
      report.ensureSpace(36)
      report.subheading(
        `${index + 1}. ${participantName(response)} — ${response.participant.email}`,
        `${ANSWER_STATUS_STYLES[response.status].label} · ${answered}/${asked.length} answered`,
      )
      report.paragraph(
        [
          `Event: ${response.event}`,
          `Questionnaire: ${response.formTitle}`,
          `Department: ${response.participant.department ?? '—'}`,
          `Submitted: ${dayjs(response.submittedAt).format(PDF_GENERATED_AT_FORMAT)}`,
          `Response ID: ${response.id}`,
        ].join('   ·   '),
        { muted: true },
      )
      report.table(
        ['#', 'Question', 'Answer'],
        asked.map((question, qIndex) => [
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
