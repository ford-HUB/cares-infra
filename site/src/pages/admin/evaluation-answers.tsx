import { useEffect, useMemo, useState } from 'react'
import { AnswersTable } from '../../components/evaluation/answers-table'
import { AnswersToolbar } from '../../components/evaluation/answers-toolbar'
import { AnswerDetailsModal } from '../../components/evaluation/ui/answer-details-modal'
import { ContentShell } from '../../components/portal/ui/content-shell'
import {
  ANSWER_DEPARTMENT_FILTER_ALL,
  ANSWER_RATING_FILTER_ALL,
  ANSWER_STATUS_FILTER_ALL,
  DEFAULT_SCALE_MAX,
  type AnswerStatusFilter,
} from '../../constants/evaluation'
import { useEvaluationStore } from '../../store/evaluation-store'
import type { EvaluationResponse } from '../../types/evaluation'
import { exportAnswersCsv } from '../../utils/export-answers-csv'

export function EvaluationAnswersPage() {
  const form = useEvaluationStore((s) => s.form)
  const formInitialized = useEvaluationStore((s) => s.formInitialized)
  const fetchForm = useEvaluationStore((s) => s.fetchForm)
  const responses = useEvaluationStore((s) => s.responses)
  const loading = useEvaluationStore((s) => s.responsesLoading)
  const initialized = useEvaluationStore((s) => s.responsesInitialized)
  const fetchResponses = useEvaluationStore((s) => s.fetchResponses)

  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState<string>(ANSWER_DEPARTMENT_FILTER_ALL)
  const [rating, setRating] = useState<string>(ANSWER_RATING_FILTER_ALL)
  const [status, setStatus] = useState<AnswerStatusFilter>(ANSWER_STATUS_FILTER_ALL)
  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState<EvaluationResponse | null>(null)

  // The answers need the questions for their labels — load the form alongside.
  useEffect(() => {
    if (!formInitialized) void fetchForm()
    void fetchResponses()
  }, [formInitialized, fetchForm, fetchResponses])

  const questions = useMemo(() => form?.questions ?? [], [form])
  const ratingMax =
    questions.find((question) => question.type === 'star_rating')?.scaleMax ?? DEFAULT_SCALE_MAX

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return responses.filter((response) => {
      const { participant } = response
      const matchesSearch =
        !term ||
        participant.email.toLowerCase().includes(term) ||
        `${participant.firstName} ${participant.lastName}`.toLowerCase().includes(term) ||
        response.event.toLowerCase().includes(term)
      const matchesDepartment =
        department === ANSWER_DEPARTMENT_FILTER_ALL || participant.department === department
      const matchesRating =
        rating === ANSWER_RATING_FILTER_ALL || response.rating === Number(rating)
      const matchesStatus = status === ANSWER_STATUS_FILTER_ALL || response.status === status
      return matchesSearch && matchesDepartment && matchesRating && matchesStatus
    })
  }, [search, department, rating, status, responses])

  const departments = useMemo(
    () =>
      [...new Set(responses.map((r) => r.participant.department).filter(Boolean))] as string[],
    [responses],
  )

  const averageRating = responses.length
    ? responses.reduce((sum, response) => sum + response.rating, 0) / responses.length
    : 0

  const resetToFirstPage =
    <T,>(apply: (value: T) => void) =>
    (value: T) => {
      apply(value)
      setPage(1)
    }

  return (
    <ContentShell variant="full" className="flex h-full flex-col">
      <AnswersToolbar
        search={search}
        department={department}
        rating={rating}
        status={status}
        departments={departments}
        shown={filtered.length}
        total={responses.length}
        averageRating={averageRating}
        initialized={initialized}
        onSearchChange={resetToFirstPage(setSearch)}
        onDepartmentChange={resetToFirstPage(setDepartment)}
        onRatingChange={resetToFirstPage(setRating)}
        onStatusChange={resetToFirstPage(setStatus)}
        onExport={() => exportAnswersCsv(filtered, questions)}
      />

      <AnswersTable
        responses={filtered}
        loading={loading}
        initialized={initialized}
        page={page}
        ratingMax={ratingMax}
        onPageChange={setPage}
        onView={setViewing}
      />

      <AnswerDetailsModal
        response={viewing}
        questions={questions}
        onClose={() => setViewing(null)}
      />
    </ContentShell>
  )
}
