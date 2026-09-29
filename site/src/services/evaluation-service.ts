import type {
  AssignableEvent,
  EvaluationAnswerValue,
  EvaluationAssignment,
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
  is_default: boolean
  assigned_events: number
  response_count: number
  created_at: string
  updated_at: string
}

interface AssignmentPayload {
  evaluation_assignment_id: string
  form_id: string
  form_title: string
  form_status: 'DRAFT' | 'PUBLISHED'
  event_id: number
  event_title: string
  event_location: string
  event_status: string
  event_started: string
  event_ended: string
  participants: number
  assigned_by: string | null
  assigned_at: string
}

interface AssignableEventPayload {
  event_id: number
  title: string
  location: string
  status: string
  participants: number
  event_started: string
  event_ended: string
  assigned_form_id: string | null
}

interface ResponsePayload {
  evaluation_response_id: string
  form_id: string
  form_title: string
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
    isDefault: payload.is_default,
    assignedEvents: payload.assigned_events,
    responseCount: payload.response_count,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
  }
}

function toAssignment(payload: AssignmentPayload): EvaluationAssignment {
  return {
    id: payload.evaluation_assignment_id,
    formId: payload.form_id,
    formTitle: payload.form_title,
    formStatus: payload.form_status === 'PUBLISHED' ? 'published' : 'draft',
    eventId: payload.event_id,
    eventTitle: payload.event_title,
    eventLocation: payload.event_location,
    eventStatus: payload.event_status,
    eventStarted: payload.event_started,
    eventEnded: payload.event_ended,
    participants: payload.participants,
    assignedBy: payload.assigned_by,
    assignedAt: payload.assigned_at,
  }
}

function toAssignableEvent(payload: AssignableEventPayload): AssignableEvent {
  return {
    id: payload.event_id,
    title: payload.title,
    location: payload.location,
    status: payload.status,
    participants: payload.participants,
    started: payload.event_started,
    ended: payload.event_ended,
    assignedFormId: payload.assigned_form_id,
  }
}

function toResponse(row: ResponsePayload): EvaluationResponse {
  return {
    id: row.evaluation_response_id,
    formId: row.form_id,
    formTitle: row.form_title,
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

/** Every questionnaire — the builder's switcher and the Forms page read the same list. */
export async function listEvaluationForms(): Promise<ApiResponse<EvaluationForm[]>> {
  try {
    const { data: body } = await apiClient.get<ApiEnvelope<FormPayload[]>>(
      '/api/v1/evaluation/forms',
    )
    return { success: true, data: body.data.map(toForm) }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

export async function getEvaluationForm(
  formId: string,
): Promise<ApiResponse<EvaluationForm>> {
  try {
    const { data: body } = await apiClient.get<ApiEnvelope<FormPayload>>(
      `/api/v1/evaluation/forms/${formId}`,
    )
    return { success: true, data: toForm(body.data) }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

/** A new questionnaire opens empty and as a draft; the builder fills it. */
export async function createEvaluationForm(
  title: string,
  description = '',
): Promise<ApiResponse<EvaluationForm>> {
  try {
    const { data: body } = await apiClient.post<ApiEnvelope<FormPayload>>(
      '/api/v1/evaluation/forms',
      { title, description },
    )
    return { success: true, data: toForm(body.data), message: body.message }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

/**
 * Replaces one questionnaire wholesale. `status` decides whether the volunteer app
 * can see it: only a published form is served for feedback.
 */
export async function saveEvaluationForm(
  form: EvaluationForm,
  status: EvaluationForm['status'] = form.status,
): Promise<ApiResponse<EvaluationForm>> {
  try {
    const { data: body } = await apiClient.put<ApiEnvelope<FormPayload>>(
      `/api/v1/evaluation/forms/${form.id}`,
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

export async function deleteEvaluationForm(
  formId: string,
): Promise<ApiResponse<null>> {
  try {
    const { data: body } = await apiClient.delete<ApiEnvelope<null>>(
      `/api/v1/evaluation/forms/${formId}`,
    )
    return { success: true, data: null, message: body.message }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

/** Makes one questionnaire the fallback for events with none assigned. */
export async function setDefaultEvaluationForm(
  formId: string,
): Promise<ApiResponse<EvaluationForm>> {
  try {
    const { data: body } = await apiClient.put<ApiEnvelope<FormPayload>>(
      `/api/v1/evaluation/forms/${formId}/default`,
      {},
    )
    return { success: true, data: toForm(body.data), message: body.message }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

export async function listEvaluationAssignments(): Promise<
  ApiResponse<EvaluationAssignment[]>
> {
  try {
    const { data: body } = await apiClient.get<ApiEnvelope<AssignmentPayload[]>>(
      '/api/v1/evaluation/assignments',
    )
    return { success: true, data: body.data.map(toAssignment) }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

/** Every event the picker offers, flagged with the questionnaire it already carries. */
export async function listAssignableEvents(): Promise<ApiResponse<AssignableEvent[]>> {
  try {
    const { data: body } = await apiClient.get<
      ApiEnvelope<AssignableEventPayload[]>
    >('/api/v1/evaluation/assignable-events')
    return { success: true, data: body.data.map(toAssignableEvent) }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

/** Points one event at one questionnaire, replacing whatever it had. */
export async function assignEvaluationForm(
  formId: string,
  eventId: number,
): Promise<ApiResponse<EvaluationAssignment>> {
  try {
    const { data: body } = await apiClient.post<ApiEnvelope<AssignmentPayload>>(
      '/api/v1/evaluation/assignments',
      { form_id: formId, event_id: eventId },
    )
    return { success: true, data: toAssignment(body.data), message: body.message }
  } catch (error) {
    return { success: false, message: parseApiError(error), data: null }
  }
}

/** Puts the event back on the default questionnaire. */
export async function unassignEvaluationForm(
  assignmentId: string,
): Promise<ApiResponse<null>> {
  try {
    const { data: body } = await apiClient.delete<ApiEnvelope<null>>(
      `/api/v1/evaluation/assignments/${assignmentId}`,
    )
    return { success: true, data: null, message: body.message }
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
