import type {
  EvaluationAnswerValue,
  EvaluationForm,
  EvaluationQuestion,
  EvaluationResponse,
  EvaluationTypography,
} from '../types/evaluation'
import type { ApiResponse } from '../types/portal-roles'
import { apiClient, parseApiError } from './api-client'

/** Backend wraps successful responses in an { ok, data } envelope. */
type ApiEnvelope<T> = { ok: true; message?: string; data: T }

/* ---------- Wire shapes (snake_case, as the server's Zod schemas emit them) ---------- */

interface TypographyPayload {
  font_family: EvaluationTypography['fontFamily']
  font_size: EvaluationTypography['fontSize']
}

interface QuestionPayload {
  id: string
  type: EvaluationQuestion['type']
  title: string
  description: string
  required: boolean
  options: string[]
  scale_max: number
  scale_min_label: string
  scale_max_label: string
  typography: TypographyPayload
}

interface FormPayload {
  evaluation_form_id: string
  title: string
  description: string
  header_typography: TypographyPayload
  questions: QuestionPayload[]
  status: 'DRAFT' | 'PUBLISHED'
  updated_at: string
}

interface ResponsePayload {
  evaluation_response_id: string
  event_id: number
  event_title: string
  user_id: string
  firstname: string
  lastname: string
  email: string
  department: string | null
  submitted_at: string
  rating: number | null
  status: 'COMPLETE' | 'PARTIAL'
  answers: Record<string, EvaluationAnswerValue>
}

/* ---------- Mapping ---------- */

const toTypography = (t: TypographyPayload): EvaluationTypography => ({
  fontFamily: t.font_family,
  fontSize: t.font_size,
})

const fromTypography = (t: EvaluationTypography): TypographyPayload => ({
  font_family: t.fontFamily,
  font_size: t.fontSize,
})

function toQuestion(q: QuestionPayload): EvaluationQuestion {
  return {
    id: q.id,
    type: q.type,
    title: q.title,
    description: q.description,
    required: q.required,
    options: q.options,
    scaleMax: q.scale_max,
    scaleMinLabel: q.scale_min_label,
    scaleMaxLabel: q.scale_max_label,
    typography: toTypography(q.typography),
  }
}

function fromQuestion(q: EvaluationQuestion): QuestionPayload {
  return {
    id: q.id,
    type: q.type,
    title: q.title,
    description: q.description,
    required: q.required,
    options: q.options,
    scale_max: q.scaleMax,
    scale_min_label: q.scaleMinLabel,
    scale_max_label: q.scaleMaxLabel,
    typography: fromTypography(q.typography),
  }
}

function toForm(payload: FormPayload): EvaluationForm {
  return {
    id: payload.evaluation_form_id,
    title: payload.title,
    description: payload.description,
    headerTypography: toTypography(payload.header_typography),
    questions: payload.questions.map(toQuestion),
    status: payload.status === 'PUBLISHED' ? 'published' : 'draft',
    updatedAt: payload.updated_at,
  }
}

function toResponse(row: ResponsePayload): EvaluationResponse {
  return {
    id: row.evaluation_response_id,
    participant: {
      id: row.user_id,
      firstName: row.firstname,
      lastName: row.lastname,
      email: row.email,
      department: row.department,
    },
    eventId: row.event_id,
    event: row.event_title,
    submittedAt: row.submitted_at,
    rating: row.rating ?? 0,
    status: row.status === 'COMPLETE' ? 'complete' : 'partial',
    answers: row.answers,
  }
}

/* ---------- Calls ---------- */

export async function getEvaluationForm(): Promise<ApiResponse<EvaluationForm>> {
  try {
    const { data: body } = await apiClient.get<ApiEnvelope<FormPayload>>(
      '/api/v1/evaluation/form',
    )
    return { success: true, data: toForm(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

/**
 * Replaces the questionnaire wholesale. `status` decides whether the volunteer app
 * can see it: only a published form is served for feedback.
 */
export async function saveEvaluationForm(
  form: EvaluationForm,
  status: EvaluationForm['status'] = form.status,
): Promise<ApiResponse<EvaluationForm>> {
  try {
    const { data: body } = await apiClient.put<ApiEnvelope<FormPayload>>(
      '/api/v1/evaluation/form',
      {
        title: form.title,
        description: form.description,
        header_typography: fromTypography(form.headerTypography),
        questions: form.questions.map(fromQuestion),
        status: status === 'published' ? 'PUBLISHED' : 'DRAFT',
      },
    )
    return { success: true, data: toForm(body.data), message: body.message }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

/** Every submitted response, or one event's; the page filters the rest client-side. */
export async function listEvaluationResponses(
  eventId?: number,
): Promise<ApiResponse<EvaluationResponse[]>> {
  try {
    const { data: body } = await apiClient.get<ApiEnvelope<ResponsePayload[]>>(
      '/api/v1/evaluation/responses',
      { params: eventId ? { event_id: eventId } : undefined },
    )
    return { success: true, data: body.data.map(toResponse) }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}
