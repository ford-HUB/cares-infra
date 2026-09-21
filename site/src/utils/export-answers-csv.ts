import type { EvaluationQuestion, EvaluationResponse } from '../types/evaluation'

const FIXED_HEADERS = ['First Name', 'Last Name', 'Email', 'Department', 'Event', 'Submitted', 'Rating', 'Status']

function escapeCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

/** Downloads the responses as CSV — one column per question, in form order. */
export function exportAnswersCsv(
  responses: EvaluationResponse[],
  questions: EvaluationQuestion[],
  filename = 'evaluation-answers.csv',
) {
  const headers = [...FIXED_HEADERS, ...questions.map((q) => q.title || 'Untitled question')]

  const rows = responses.map((response) =>
    [
      response.participant.firstName,
      response.participant.lastName,
      response.participant.email,
      response.participant.department ?? '',
      response.event,
      response.submittedAt,
      String(response.rating),
      response.status,
      ...questions.map((q) => {
        const value = response.answers[q.id]
        if (value === undefined || value === null) return ''
        return Array.isArray(value) ? value.join('; ') : String(value)
      }),
    ]
      .map(escapeCell)
      .join(','),
  )

  const csv = [headers.map(escapeCell).join(','), ...rows].join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
