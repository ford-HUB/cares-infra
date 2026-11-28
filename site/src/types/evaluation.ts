export type EvaluationQuestionType =
  | 'short_answer'
  | 'paragraph'
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'linear_scale'
  | 'star_rating'
  | 'date'
  | 'image_upload'

/** All loaded by `index.css`. */
export type EvaluationFontFamily =
  | 'inter'
  | 'lato'
  | 'montserrat'
  | 'lora'
  | 'merriweather'
  | 'playfair'
  | 'garamond'

export type EvaluationFontSize = 'sm' | 'md' | 'lg' | 'xl'

export interface EvaluationTypography {
  fontFamily: EvaluationFontFamily
  fontSize: EvaluationFontSize
}

export interface EvaluationQuestion {
  id: string
  type: EvaluationQuestionType
  title: string
  description: string
  required: boolean
  /** Multiple choice, checkboxes and dropdown only. */
  options: string[]
  /** Linear scale (1–N) and star rating. */
  scaleMax: number
  scaleMinLabel: string
  scaleMaxLabel: string
  /** Image upload only. */
  maxFiles: number
  typography: EvaluationTypography
}

export interface EvaluationForm {
  id: string
  title: string
  description: string
  headerTypography: EvaluationTypography
  questions: EvaluationQuestion[]
  status: 'draft' | 'published'
  /** Served for events with no questionnaire; exactly one form holds this. */
  isDefault: boolean
  assignedEvents: number
  responseCount: number
  createdAt: string
  updatedAt: string
}

/** An event has at most one; a questionnaire can serve many. */
export interface EvaluationAssignment {
  id: string
  formId: string
  formTitle: string
  formStatus: 'draft' | 'published'
  eventId: number
  eventTitle: string
  eventLocation: string
  eventStatus: string
  eventStarted: string
  eventEnded: string
  participants: number
  /** Null once that account is gone. */
  assignedBy: string | null
  assignedAt: string
}

export interface AssignableEvent {
  id: number
  title: string
  location: string
  status: string
  participants: number
  started: string
  ended: string
  assignedFormId: string | null
}

export interface EvaluationFormCounts {
  forms: number
  published: number
  draft: number
  assignedEvents: number
  /** These answer the default questionnaire. */
  unassignedEvents: number
  responses: number
}

/** Image uploads hold stored keys; read them through the response's image route. */
export type EvaluationAnswerValue = string | string[] | number | null

export interface EvaluationResponse {
  id: string
  formId: string
  formTitle: string
  participant: {
    id: string
    firstName: string
    lastName: string
    email: string
    department: string | null
  }
  eventId: number
  event: string
  submittedAt: string
  rating: number
  status: 'complete' | 'partial'
  answers: Record<string, EvaluationAnswerValue>
}
