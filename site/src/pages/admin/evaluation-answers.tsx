import { useEffect, useMemo, useState } from 'react'
import { AnswersTable } from '../../components/evaluation/answers-table'
import { AnswersToolbar } from '../../components/evaluation/answers-toolbar'
import { AnswerDetailsModal } from '../../components/evaluation/ui/answer-details-modal'
import { ContentShell } from '../../components/portal/ui/content-shell'
import {
  ANSWER_DEPARTMENT_FILTER_ALL,
  ANSWER_EVENT_FILTER_ALL,
  ANSWER_RATING_FILTER_ALL,
  ANSWER_STATUS_FILTER_ALL,
  ANSWER_STATUS_FILTERS,
  DEFAULT_SCALE_MAX,
  type AnswerStatusFilter,
} from '../../constants/evaluation'
import { useEvaluationStore } from '../../store/evaluation-store'
import type { EvaluationResponse } from '../../types/evaluation'
import { exportAnswersPdf } from '../../utils/export-answers-pdf'

export function EvaluationAnswersPage() {
  const forms = useEvaluationStore((s) => s.forms)
  const formsInitialized = useEvaluationStore((s) => s.formsInitialized)
  const fetchForms = useEvaluationStore((s) => s.fetchForms)
  const responses = useEvaluationStore((s) => s.responses)
  const loading = useEvaluationStore((s) => s.responsesLoading)
  const initialized = useEvaluationStore((s) => s.responsesInitialized)
  const fetchResponses = useEvaluationStore((s) => s.fetchResponses)

  const [search, setSearch] = useState('')
  const [event, setEvent] = useState<string>(ANSWER_EVENT_FILTER_ALL)
  const [department, setDepartment] = useState<string>(ANSWER_DEPARTMENT_FILTER_ALL)
  const [rating, setRating] = useState<string>(ANSWER_RATING_FILTER_ALL)
  const [status, setStatus] = useState<AnswerStatusFilter>(ANSWER_STATUS_FILTER_ALL)
  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState<EvaluationResponse | null>(null)

  // The answers need the questions for their labels. Events can ask different
  // questionnaires, so every one is loaded and each response is read against its own.
  useEffect(() => {
    if (!formsInitialized) void fetchForms()
    void fetchResponses()
  }, [formsInitialized, fetchForms, fetchResponses])

  const questionsByForm = useMemo(
    () => new Map(forms.map((one) => [one.id, one.questions])),
    [forms],
  )

  const questionsFor = useMemo(
    () => (response: EvaluationResponse) => questionsByForm.get(response.formId) ?? [],
    [questionsByForm],
  )

  /**
   * Every question any of these answers was asked, in form order and de-duplicated —
   * the question summary spans whatever questionnaires the filtered responses used.
   */
  const questions = useMemo(() => {
    const seen = new Map<string, (typeof forms)[number]['questions'][number]>()
    for (const one of forms) {
      for (const question of one.questions) {
        if (!seen.has(question.id)) seen.set(question.id, question)
      }
    }
    return [...seen.values()]
  }, [forms])
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
      const matchesEvent =
        event === ANSWER_EVENT_FILTER_ALL || response.eventId === Number(event)
      const matchesDepartment =
        department === ANSWER_DEPARTMENT_FILTER_ALL || participant.department === department
      const matchesRating =
        rating === ANSWER_RATING_FILTER_ALL || response.rating === Number(rating)
      const matchesStatus = status === ANSWER_STATUS_FILTER_ALL || response.status === status
      return matchesSearch && matchesEvent && matchesDepartment && matchesRating && matchesStatus
    })
  }, [search, event, department, rating, status, responses])

  // Responses arrive newest first, so the first sighting of each event keeps that order.
  const events = useMemo(() => {
    const seen = new Map<number, string>()
    for (const response of responses) {
      if (!seen.has(response.eventId)) seen.set(response.eventId, response.event)
    }
    return [...seen].map(([id, title]) => ({ id, title }))
  }, [responses])

  const departments = useMemo(
    () =>
      [...new Set(responses.map((r) => r.participant.department).filter(Boolean))] as string[],
    [responses],
  )

  /**
   * The questionnaire behind the filtered set, when they all came from one — it
   * titles the export. A mixed set has no single form, so the export falls back to
   * its generic heading.
   */
  const formInScope = useMemo(() => {
    const ids = new Set(filtered.map((response) => response.formId))
    if (ids.size !== 1) return null
    return forms.find((one) => one.id === [...ids][0]) ?? null
  }, [filtered, forms])

  // The average follows the event filter so a director reading one event sees its own score.
  const rated = filtered.filter((response) => response.rating > 0)
  const averageRating = rated.length
    ? rated.reduce((sum, response) => sum + response.rating, 0) / rated.length
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
        event={event}
        events={events}
        department={department}
        rating={rating}
        status={status}
        departments={departments}
        shown={filtered.length}
        total={responses.length}
        averageRating={averageRating}
        initialized={initialized}
        onSearchChange={resetToFirstPage(setSearch)}
        onEventChange={resetToFirstPage(setEvent)}
        onDepartmentChange={resetToFirstPage(setDepartment)}
        onRatingChange={resetToFirstPage(setRating)}
        onStatusChange={resetToFirstPage(setStatus)}
        onExport={() =>
          exportAnswersPdf(filtered, questions, {
            form: formInScope,
            questionsFor,
            total: responses.length,
            filters: [
              { label: 'Search', value: search.trim() },
              {
                label: 'Event',
                value:
                  event === ANSWER_EVENT_FILTER_ALL
                    ? ''
                    : (events.find((e) => e.id === Number(event))?.title ?? event),
              },
              {
                label: 'Department',
                value: department === ANSWER_DEPARTMENT_FILTER_ALL ? '' : department,
              },
              {
                label: 'Rating',
                value: rating === ANSWER_RATING_FILTER_ALL ? '' : `${rating} star${rating === '1' ? '' : 's'}`,
              },
              {
                label: 'Status',
                value:
                  status === ANSWER_STATUS_FILTER_ALL
                    ? ''
                    : (ANSWER_STATUS_FILTERS.find((s) => s.value === status)?.label ?? status),
              },
            ],
          })
        }
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
        questions={viewing ? questionsFor(viewing) : []}
        onClose={() => setViewing(null)}
      />
    </ContentShell>
  )
}
